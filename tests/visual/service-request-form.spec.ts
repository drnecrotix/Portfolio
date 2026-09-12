import { expect, test, type Page } from '@playwright/test';

const inspection = {
  requestedUrl: 'https://example.com',
  finalUrl: 'https://example.com/',
  checkedAt: '2026-09-10T20:00:00.000Z',
  statusCode: 200,
  responseTimeMs: 120,
  score: 72,
  grade: 'C',
  page: {
    title: 'Example Domain',
    language: 'en',
    h1Count: 1,
    capturedBytes: 2048,
    truncated: false,
    redirectCount: 0,
    technologies: ['Next.js'],
    wordpress: { detected: false },
  },
  checks: [
    {
      id: 'title',
      category: 'seo',
      label: 'Page title',
      status: 'warning',
      summary: 'The title could be improved.',
      recommendation: 'Use a clear descriptive title.',
    },
    {
      id: 'csp',
      category: 'security',
      label: 'Content-Security-Policy',
      status: 'fail',
      summary: 'No Content-Security-Policy header was detected.',
      recommendation: 'Add a restrictive Content-Security-Policy header.',
    },
  ],
};

function parseEstimate(text: string) {
  const match = text.match(/€(\d+)-€(\d+)/);
  expect(match, `Expected an estimate range in: ${text}`).not.toBeNull();
  return { min: Number(match?.[1]), max: Number(match?.[2]) };
}

async function currentEstimate(page: Page) {
  const text = await page.getByText(/^Estimate €\d+-€\d+$/).textContent();
  return { text: text ?? '', ...parseEstimate(text ?? '') };
}

test('service request estimate reacts to remediation context but not customer budget', async ({ page }) => {
  await page.route('**/api/website-inspector', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ inspection }),
    });
  });

  await page.goto('/services/website-inspector', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('https://example.com').fill('https://example.com');
  await page.getByRole('button', { name: 'Inspect site' }).click();

  await expect(page.getByRole('button', { name: 'Request a professional fix' })).toBeVisible();
  await page.getByRole('button', { name: 'Request a professional fix' }).click();

  const baseline = await currentEstimate(page);

  await page.getByLabel('CMS / technology').selectOption({ label: 'Custom' });
  await page.getByLabel('Access available?').selectOption({ label: 'No access yet' });
  const difficult = await currentEstimate(page);
  expect(difficult.min).toBeGreaterThan(baseline.min);
  expect(difficult.max).toBeGreaterThan(baseline.max);

  const budget = page.getByLabel(/Budget/);
  await budget.fill('50');
  const lowBudget = await currentEstimate(page);
  await budget.fill('9999');
  const highBudget = await currentEstimate(page);
  expect(highBudget.text).toBe(lowBudget.text);

  await page.getByLabel('CMS / technology').selectOption({ label: 'WordPress' });
  await page.getByLabel('Access available?').selectOption({ label: 'Both available' });
  const easy = await currentEstimate(page);
  expect(easy.min).toBeLessThan(difficult.min);
  expect(easy.max).toBeLessThan(difficult.max);

  await expect(page.getByText('Your entered budget does not change the automated estimate.')).toBeVisible();
});

test('website configurator validates an existing site and preserves contact details', async ({ page }) => {
  await page.goto('/services/website', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Redesign or expand' }).click();

  const website = page.getByLabel('Website URL');
  await website.fill('not a website');
  await expect(page.getByText('Enter an address such as https://example.com')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' }).first()).toBeDisabled();

  await website.fill('example.com');
  await page.getByRole('button', { name: 'Business / services' }).click();
  await page.getByRole('button', { name: 'Continue' }).first().click();
  await expect(page.getByText('Recommended starting point')).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).first().click();
  await expect(page.getByText('Project size')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).first().click();

  await page.getByLabel('Project name').fill('Existing site refresh');
  await page.getByLabel('Your name').fill('Test Customer');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Continue' }).first().click();

  await expect(page.getByLabel('Project name')).toHaveValue('Existing site refresh');
  await expect(page.getByLabel('Your name')).toHaveValue('Test Customer');
  await expect(page.getByLabel('Email')).toHaveValue('customer@example.com');
});
