import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = new URL(process.env.LIVE_SITE_URL || 'https://necrotixlab.com');
const maxRoutes = Math.max(10, Math.min(120, Number(process.env.LIVE_AUDIT_MAX_ROUTES || 70)));
const outputDir = path.resolve(process.env.LIVE_AUDIT_OUTPUT || 'live-site-audit');
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'mobile-small', viewport: { width: 360, height: 800 }, isMobile: true },
];
const ignoredPrefixes = ['/admin', '/api', '/auth', '/_next', '/store/download', '/store/thanks', '/store/cancel'];
const downloadableExtension = /\.(?:pdf|zip|rar|7z|tar|gz|jpg|jpeg|png|gif|webp|svg|avif|mp4|webm|mov|mp3|wav|ogg|doc|docx|xls|xlsx|ppt|pptx|psd|ai|fig|blend)$/i;

function candidate(raw) {
  try {
    const url = new URL(raw, base);
    if (url.origin !== base.origin || !['http:', 'https:'].includes(url.protocol)) return null;
    if (ignoredPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return null;
    if (downloadableExtension.test(url.pathname)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.searchParams.size) return null;
    url.pathname = url.pathname.replace(/\/{2,}/g, '/');
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

async function seedsFromSitemap() {
  const seeds = new Set([base.toString()]);
  try {
    const response = await fetch(new URL('/sitemap.xml', base), { redirect: 'follow' });
    if (response.ok) {
      const xml = await response.text();
      for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        const url = candidate(match[1].replace(/&amp;/g, '&'));
        if (url) seeds.add(url);
      }
    }
  } catch (error) {
    console.warn(`Could not read sitemap.xml: ${error instanceof Error ? error.message : String(error)}`);
  }
  return seeds;
}

async function discoverRoutes(browser) {
  const queue = [...await seedsFromSitemap()];
  const discovered = new Set(queue);
  const visited = new Set();
  const context = await browser.newContext({ viewport: profiles[0].viewport });
  const page = await context.newPage();
  while (queue.length && visited.size < maxRoutes) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (!response || response.status() >= 400) continue;
      await page.waitForTimeout(200);
      const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => anchor.href));
      for (const href of hrefs) {
        const urlToAdd = candidate(href);
        if (urlToAdd && !discovered.has(urlToAdd) && discovered.size < maxRoutes) {
          discovered.add(urlToAdd);
          queue.push(urlToAdd);
        }
      }
    } catch (error) {
      console.warn(`Discovery failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await context.close();
  return [...discovered].slice(0, maxRoutes);
}

async function auditRoute(context, url, profile) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 1000));
  });
  page.on('pageerror', (error) => pageErrors.push(error.message.slice(0, 1000)));

  let status = null;
  let navigationError = null;
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    status = response?.status() ?? null;
    await page.waitForTimeout(300);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const metrics = navigationError ? null : await page.evaluate((mobile) => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const visible = (element) => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const selector = (element) => {
      if (element.id) return `${element.tagName.toLowerCase()}#${element.id}`;
      const classes = [...element.classList].filter(Boolean).slice(0, 3);
      return `${element.tagName.toLowerCase()}${classes.length ? `.${classes.join('.')}` : ''}`.slice(0, 220);
    };
    const overflowElements = [...document.body.querySelectorAll('*')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: selector(element),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
        };
      })
      .filter((item) => item.right > viewportWidth + 2 || item.left < -2)
      .slice(0, 20);
    const brokenImages = [...document.images]
      .filter((image) => image.complete && image.currentSrc && image.naturalWidth === 0)
      .map((image) => ({ src: image.currentSrc, alt: image.alt || '' }))
      .slice(0, 20);
    const unlabelledControls = [...document.querySelectorAll('a[href], button')]
      .filter(visible)
      .filter((element) => {
        const label = (element.getAttribute('aria-label') || element.textContent || '').trim();
        const title = (element.getAttribute('title') || '').trim();
        return !label && !title && !element.querySelector('img[alt], svg[aria-label]');
      })
      .map(selector)
      .slice(0, 20);
    return {
      mobile,
      title: document.title,
      h1Count: document.querySelectorAll('h1').length,
      viewportWidth,
      scrollWidth: root.scrollWidth,
      horizontalOverflow: Math.max(0, root.scrollWidth - viewportWidth),
      scrollHeight: root.scrollHeight,
      overflowElements,
      brokenImages,
      unlabelledControls,
    };
  }, profile.isMobile);

  const issues = [];
  if (navigationError) issues.push({ type: 'navigation', severity: 'critical', detail: navigationError });
  if (status != null && status >= 400) issues.push({ type: 'http', severity: 'critical', detail: `HTTP ${status}` });
  if (metrics?.horizontalOverflow > 2) issues.push({ type: 'horizontal-overflow', severity: 'high', detail: `${metrics.horizontalOverflow}px beyond viewport`, items: metrics.overflowElements });
  if (metrics?.brokenImages.length) issues.push({ type: 'broken-image', severity: 'high', detail: `${metrics.brokenImages.length} broken loaded image(s)`, items: metrics.brokenImages });
  if (pageErrors.length) issues.push({ type: 'page-error', severity: 'high', detail: [...new Set(pageErrors)].join(' | ') });
  if (consoleErrors.length) issues.push({ type: 'console-error', severity: 'medium', detail: [...new Set(consoleErrors)].join(' | ') });
  if (metrics && !metrics.title.trim()) issues.push({ type: 'missing-title', severity: 'medium', detail: 'Document title is empty.' });
  if (metrics?.unlabelledControls.length) issues.push({ type: 'unlabelled-control', severity: 'low', detail: `${metrics.unlabelledControls.length} visible control(s) have no accessible label`, items: metrics.unlabelledControls });

  await page.close();
  return { url, profile: profile.name, status, metrics, issues };
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const routes = await discoverRoutes(browser);
console.log(`Live audit target: ${base.origin}`);
console.log(`Discovered ${routes.length} public HTML route(s).`);

const results = [];
for (const profile of profiles) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.isMobile,
    deviceScaleFactor: profile.isMobile ? 2 : 1,
    userAgent: profile.isMobile
      ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 NecrotixAudit/1.0'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 NecrotixAudit/1.0',
  });
  for (const url of routes) {
    const result = await auditRoute(context, url, profile);
    results.push(result);
    console.log(`[${profile.name}] ${new URL(url).pathname} - ${result.status ?? 'ERR'} - ${result.issues.length ? `ISSUES: ${result.issues.map((issue) => issue.type).join(', ')}` : 'OK'}`);
  }
  await context.close();
}
await browser.close();

const issueResults = results.filter((result) => result.issues.length);
const serious = issueResults
  .flatMap((result) => result.issues.map((issue) => ({ ...issue, url: result.url, profile: result.profile })))
  .filter((issue) => ['critical', 'high'].includes(issue.severity));
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: base.origin,
  routes,
  summary: { routes: routes.length, checks: results.length, checksWithIssues: issueResults.length, criticalOrHigh: serious.length },
  results,
};
await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# Necrotix Lab live responsive audit', '',
  `- Target: ${base.origin}`,
  `- Generated: ${report.generatedAt}`,
  `- Public HTML routes discovered: ${routes.length}`,
  `- Responsive checks: ${results.length}`,
  `- Checks with findings: ${issueResults.length}`,
  `- Critical/high findings: ${serious.length}`, '', '## Findings', '',
];
if (!issueResults.length) markdown.push('No findings in the audited public routes.');
for (const result of issueResults) {
  markdown.push(`### ${result.profile} - ${new URL(result.url).pathname}`, '');
  for (const issue of result.issues) markdown.push(`- **${issue.severity} / ${issue.type}**: ${issue.detail}`);
  markdown.push('');
}
await writeFile(path.join(outputDir, 'report.md'), `${markdown.join('\n')}\n`);
console.log(`Audit report written to ${outputDir}/report.json and report.md`);
if (serious.length) {
  console.error(`Live audit found ${serious.length} critical/high issue(s).`);
  process.exitCode = 2;
}
