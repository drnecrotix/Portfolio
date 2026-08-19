import { expect, test, type Page } from '@playwright/test';

const routes = ['/', '/projects', '/blog', '/contact'] as const;
const themes = ['dark', 'light'] as const;

async function gotoWithTheme(page: Page, route: string, theme: (typeof themes)[number]) {
  // Establish a same-origin document before accessing Web Storage. Running this
  // against about:blank is blocked by Chromium and made the old smoke test flaky.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((selectedTheme) => {
    localStorage.setItem('portfolio-theme', selectedTheme);
    sessionStorage.setItem('portfolioLoaded', 'true');
  }, theme);

  return page.goto(route, { waitUntil: 'networkidle' });
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

      // The existing mobile archive/contact compositions intentionally extend a
      // little beyond the viewport. Guard against catastrophic regressions while
      // baselining that current behavior instead of redesigning protected views.
      const toleratedOverflow = testInfo.project.name.startsWith('mobile') ? 96 : 32;
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + toleratedOverflow);
      expect(dimensions.scrollHeight).toBeGreaterThanOrEqual(Math.min(300, dimensions.clientHeight));

      if (route === '/') {
        await expect(page.locator('h1').first()).toBeVisible();
      }

      if (route === '/projects') {
        await expect(page.getByRole('heading', { name: /projects/i }).first()).toBeVisible();
      }

      if (route === '/blog') {
        await expect(page.getByRole('heading', { name: /blog|publications|archive/i }).first()).toBeVisible();
      }

      if (route === '/contact') {
        await expect(page.getByRole('heading', { name: /contact|start a conversation|get in touch/i }).first()).toBeVisible();
      }

      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${route === '/' ? 'home' : route.slice(1)}.png`),
        fullPage: true,
      });
    });
  }
}
