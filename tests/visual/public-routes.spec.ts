import { expect, test, type Page } from '@playwright/test';

const routes = [
  '/',
  '/projects',
  '/blog',
  '/gallery',
  '/journey',
  '/lab',
  '/wiki',
  '/wiki/articles',
  '/wiki/faq',
  '/resume',
  '/contact',
  '/store',
  '/legal',
  '/privacy',
  '/cookies',
  '/terms',
] as const;
const themes = ['dark', 'light'] as const;

async function gotoWithTheme(page: Page, route: string, theme: (typeof themes)[number]) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((selectedTheme) => {
    localStorage.setItem('portfolio-theme', selectedTheme);
    sessionStorage.setItem('portfolioLoaded', 'true');
  }, theme);

  // Do not wait for networkidle here. Some public pages intentionally perform
  // background/external requests after rendering, so network activity is not a
  // reliable readiness signal and can make the smoke suite time out on CI.
  return page.goto(route, { waitUntil: 'domcontentloaded' });
}

for (const theme of themes) {
  for (const route of routes) {
    test(`${route} renders without layout breakage in ${theme} mode`, async ({ page }, testInfo) => {
      const response = await gotoWithTheme(page, route, theme);
      expect(response?.status(), `${route} should return a successful response`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));

      // Public pages must never make the document horizontally scrollable.
      // Components that intentionally scroll sideways must own that overflow locally.
      expect(
        dimensions.scrollWidth,
        `${route} exceeds the ${testInfo.project.name} viewport by ${dimensions.scrollWidth - dimensions.clientWidth}px`,
      ).toBeLessThanOrEqual(dimensions.clientWidth + 2);
      expect(dimensions.scrollHeight).toBeGreaterThanOrEqual(Math.min(300, dimensions.clientHeight));

      if (route === '/') await expect(page.locator('h1').first()).toBeVisible();
      if (route === '/projects') {
        await expect(page.getByText(/Projects Archive/i).first()).toBeVisible();
        await expect(page.getByRole('region', { name: 'Projects list' })).toBeVisible();
      }
      if (route === '/blog') {
        await expect(page.getByRole('button', { name: /All Publications/i }).first()).toBeVisible();
        await expect(page.getByRole('searchbox', { name: 'SEARCH ARCHIVE' })).toBeVisible();
      }
      if (route === '/contact') await expect(page.getByRole('heading', { name: /contact|start a conversation|get in touch/i }).first()).toBeVisible();
      if (route === '/store') await expect(page.getByRole('heading', { name: /Creative digital goods/i })).toBeVisible();

      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}.png`),
        fullPage: true,
      });
    });
  }
}
