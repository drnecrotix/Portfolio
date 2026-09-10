import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateServiceRange, REMEDIATION_RATE_CARD } from '../../src/modules/service-requests/estimate.ts';
import { SERVICE_PRICING } from '../../src/modules/service-requests/pricing.ts';

function issue(id, status = 'warning', summary = 'Finding detected.') {
  return {
    id,
    label: id,
    status,
    summary,
  };
}

const availableWordPress = { cms: 'WordPress', accessStatus: 'Both available' };

test('FAIL findings cost more than equivalent WARN findings', () => {
  const warn = estimateServiceRange('WEBSITE_INSPECTOR', [issue('csp', 'warning')], availableWordPress);
  const fail = estimateServiceRange('WEBSITE_INSPECTOR', [issue('csp', 'fail')], availableWordPress);

  assert.ok(fail.min > warn.min);
  assert.ok(fail.max > warn.max);
});

test('finding complexity increases the estimate in the expected order', () => {
  const simple = estimateServiceRange('WEBSITE_INSPECTOR', [issue('title')], availableWordPress);
  const complex = estimateServiceRange('WEBSITE_INSPECTOR', [issue('csp')], availableWordPress);
  const specialist = estimateServiceRange('WEBSITE_INSPECTOR', [issue('https')], availableWordPress);

  assert.ok(simple.min < complex.min);
  assert.ok(complex.min < specialist.min);
  assert.ok(simple.max < complex.max);
  assert.ok(complex.max < specialist.max);
});

test('bounded affected-item volume raises crawl remediation estimates', () => {
  const one = estimateServiceRange('SITE_CRAWL', [issue('broken-links', 'warning', '1 broken link found.')], availableWordPress);
  const many = estimateServiceRange('SITE_CRAWL', [issue('broken-links', 'warning', '8 broken links found.')], availableWordPress);

  assert.ok(many.min > one.min);
  assert.ok(many.max > one.max);
  assert.equal(many.breakdown.additionalAffectedItems, 7);
});

test('CMS complexity and access availability refine web estimates', () => {
  const findings = [issue('csp', 'fail'), issue('title', 'warning')];
  const easyAccess = estimateServiceRange('WEBSITE_INSPECTOR', findings, availableWordPress);
  const difficultAccess = estimateServiceRange('WEBSITE_INSPECTOR', findings, { cms: 'Custom', accessStatus: 'No access yet' });

  assert.ok(difficultAccess.min > easyAccess.min);
  assert.ok(difficultAccess.max > easyAccess.max);
  assert.equal(easyAccess.breakdown.cmsModifier, 1);
  assert.equal(easyAccess.breakdown.accessModifier, 0.9);
  assert.equal(difficultAccess.breakdown.cmsModifier, 1.22);
  assert.equal(difficultAccess.breakdown.accessModifier, 1.18);
});

test('email-domain estimates remain independent from CMS and access modifiers', () => {
  const findings = [issue('spf', 'fail'), issue('dmarc', 'warning')];
  const first = estimateServiceRange('EMAIL_DOMAIN_SECURITY', findings, availableWordPress);
  const second = estimateServiceRange('EMAIL_DOMAIN_SECURITY', findings, { cms: 'Custom', accessStatus: 'No access yet' });

  assert.deepEqual(second, first);
  assert.equal(first.breakdown.cmsModifier, 1);
  assert.equal(first.breakdown.accessModifier, 1);
});

test('bundle adjustment remains bounded and predictable', () => {
  const two = estimateServiceRange('WEBSITE_INSPECTOR', [issue('title'), issue('description')], availableWordPress);
  const three = estimateServiceRange('WEBSITE_INSPECTOR', [issue('title'), issue('description'), issue('viewport')], availableWordPress);
  const six = estimateServiceRange('WEBSITE_INSPECTOR', [
    issue('title'),
    issue('description'),
    issue('viewport'),
    issue('nosniff'),
    issue('referrer-policy'),
    issue('h1'),
  ], availableWordPress);

  assert.equal(two.breakdown.bundleModifier, 1);
  assert.equal(three.breakdown.bundleModifier, 0.9);
  assert.equal(six.breakdown.bundleModifier, 0.82);
});

test('Bulgarian market pricing is published in EUR with ordered monthly tiers', () => {
  assert.equal(SERVICE_PRICING.market, 'Bulgaria');
  assert.equal(SERVICE_PRICING.currency, 'EUR');
  assert.deepEqual(SERVICE_PRICING.monthly.map((plan) => plan.price), [89, 149, 249, 399]);
  assert.equal(SERVICE_PRICING.oneOff.find((item) => item.id === 'technical-seo-audit')?.priceFrom, 119);
});

test('automated remediation estimates cannot exceed published safety caps', () => {
  const findings = Array.from({ length: 20 }, (_, index) => issue(index % 2 ? 'https' : 'csp', 'fail'));
  const estimate = estimateServiceRange('WEBSITE_INSPECTOR', findings, { cms: 'Custom', accessStatus: 'No access yet' });

  assert.ok(estimate.min <= REMEDIATION_RATE_CARD.caps.min);
  assert.ok(estimate.max <= REMEDIATION_RATE_CARD.caps.max);
  assert.equal(estimate.currency, 'EUR');
});
