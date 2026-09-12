import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateServiceRange, REMEDIATION_RATE_CARD } from '../../src/modules/service-requests/estimate.ts';
import { SERVICE_PRICING } from '../../src/modules/service-requests/pricing.ts';
import { domainSuggestions, domainTld, normalizeDomainCandidate } from '../../src/modules/domain-availability/domain.ts';
import { validWebsiteUrl } from '../../src/modules/service-requests/website-order.ts';

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

test('website build estimates react to type, size, design and functionality', () => {
  const basic = estimateServiceRange('WEBSITE_BUILD', [issue('site-landing'), issue('pages-1-3'), issue('design-adapted')]);
  const business = estimateServiceRange('WEBSITE_BUILD', [issue('site-business'), issue('pages-4-7'), issue('design-custom'), issue('feature-contact'), issue('feature-seo')]);
  const store = estimateServiceRange('WEBSITE_BUILD', [issue('site-store'), issue('pages-8-15'), issue('design-custom'), issue('feature-payments'), issue('feature-accounts')]);
  assert.equal(basic.min, 150);
  assert.ok(business.min > basic.min);
  assert.ok(store.min > business.min);
  assert.equal(store.currency, 'EUR');
});

test('admin pricing overrides are applied to website and support estimates', () => {
  const website = estimateServiceRange('WEBSITE_BUILD', [issue('site-business')], { websiteBuildBase: { 'site-business': { min: 280, max: 420 } } });
  const support = estimateServiceRange('WEBSITE_SUPPORT', [issue('support-wordpress'), issue('support-small-fix')], { supportOneOff: { 'small-fix': { min: 40, max: 80 } } });
  assert.deepEqual([website.min, website.max], [280, 420]);
  assert.deepEqual([support.min, support.max], [40, 80]);
});

test('specialized community and content builds include their tailored scope', () => {
  const recipeSite = estimateServiceRange('WEBSITE_BUILD', [issue('site-recipes'), issue('feature-recipes'), issue('feature-filters')]);
  const gamingCommunity = estimateServiceRange('WEBSITE_BUILD', [issue('site-community'), issue('feature-community'), issue('feature-discord'), issue('feature-moderation')]);
  const customDirectory = estimateServiceRange('WEBSITE_BUILD', [issue('site-directory'), issue('feature-directory'), issue('feature-accounts'), issue('feature-filters')]);

  assert.ok(gamingCommunity.min > recipeSite.min);
  assert.ok(customDirectory.min > gamingCommunity.min);
  assert.equal(customDirectory.currency, 'EUR');
});

test('existing website improvements do not use a full new-build base price', () => {
  const build = estimateServiceRange('WEBSITE_BUILD', [issue('site-business'), issue('feature-performance')], { cms: 'WordPress' });
  const improvement = estimateServiceRange('WEBSITE_IMPROVEMENT', [issue('existing-site-project'), issue('site-business'), issue('feature-performance')], { cms: 'WordPress' });

  assert.ok(improvement.min < build.min);
  assert.ok(improvement.max < build.max);
  assert.equal(improvement.currency, 'EUR');
});

test('existing website flow accepts real hosts and rejects arbitrary text', () => {
  assert.equal(validWebsiteUrl('example.com'), true);
  assert.equal(validWebsiteUrl('https://sub.example.com/path'), true);
  assert.equal(validWebsiteUrl('not a website'), false);
  assert.equal(validWebsiteUrl('localhost'), false);
});

test('website support estimates distinguish WordPress from custom work and urgency', () => {
  const wordpress = estimateServiceRange('WEBSITE_SUPPORT', [issue('support-wordpress'), issue('support-small-fix')]);
  const custom = estimateServiceRange('WEBSITE_SUPPORT', [issue('support-custom'), issue('support-feature'), issue('support-urgent')]);
  assert.ok(wordpress.min >= 45);
  assert.ok(custom.min > wordpress.min);
  assert.equal(custom.currency, 'EUR');
  assert.deepEqual(SERVICE_PRICING.websiteBuilds.map((item) => item.priceFrom), [149, 229, 329, 349, 599, 790]);
  assert.deepEqual(SERVICE_PRICING.supportMonthly.map((plan) => plan.price), [49, 89, 149, 119, 229, 399]);
});

test('domain availability input is normalized and produces distinct alternatives', () => {
  assert.equal(normalizeDomainCandidate('https://WWW.Example.COM/path'), 'example.com');
  assert.equal(domainTld('example.co.uk'), 'uk');
  const suggestions = domainSuggestions('example.com');
  assert.ok(suggestions.length >= 3);
  assert.ok(!suggestions.includes('example.com'));
});
