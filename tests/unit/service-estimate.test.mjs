import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateServiceRange } from '../../src/modules/service-requests/estimate.ts';

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
  assert.equal(easyAccess.breakdown.accessModifier, 0.92);
  assert.equal(difficultAccess.breakdown.cmsModifier, 1.25);
  assert.equal(difficultAccess.breakdown.accessModifier, 1.2);
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
  assert.equal(three.breakdown.bundleModifier, 0.92);
  assert.equal(six.breakdown.bundleModifier, 0.85);
});
