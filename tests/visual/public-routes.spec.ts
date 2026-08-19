import { expect, test } from '@playwright/test';

const routes = ['/', '/projects', '/blog', '/contact'] as const;
const themes = ['dark', 'light'] as const;

for (const theme of themes) {
  for (const route of routes) {
    test(`${route} renders without layout breakage in ${theme} mode`, async ({ page }, testInfo) => {
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem('portfolio-theme', selectedTheme);
        sessionStorage.setItem('portfolioLoaded', 'true');
      }, theme);

      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status(), `${route} should return a successful response`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
      expect(dimensions.scrollHeight).toBeGreaterThanOrEqual(Math.min(300, dimensions.clientHeight));

      if (route === '/') {
        await expect(page.getByText('DIGITAL LAB', { exact: true })).toBeVisible();
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
