import assert from 'node:assert/strict';
import test from 'node:test';

import { extractKeywordCandidates, normalizeSeoTarget, scoreSeoPages, targetMatchesDomain } from '../../src/modules/seo-intelligence/core.ts';

function page(overrides = {}) {
  return {
    url: 'https://example.bg/',
    statusCode: 200,
    title: 'Уеб дизайн България',
    description: 'Професионална изработка на модерни сайтове за бизнес клиенти.',
    h1: ['Уеб дизайн България'],
    h2: ['Изработка на сайтове'],
    canonical: 'https://example.bg/',
    noindex: false,
    schemaCount: 1,
    wordCount: 650,
    internalLinks: 8,
    externalLinks: 2,
    genericAnchors: 0,
    nofollowLinks: 0,
    redirects: 0,
    text: 'Уеб дизайн и изработка на сайтове. Модерни сайтове за български бизнес и онлайн присъствие.',
    ...overrides,
  };
}

test('normalizeSeoTarget reduces URLs to a lowercase host', () => {
  assert.equal(normalizeSeoTarget('https://www.Example.BG/path?q=1'), 'example.bg');
  assert.equal(normalizeSeoTarget('example.bg/path'), 'example.bg');
});

test('targetMatchesDomain accepts the exact host and its subdomains', () => {
  assert.equal(targetMatchesDomain('example.bg', 'example.bg'), true);
  assert.equal(targetMatchesDomain('example.bg', 'shop.example.bg'), true);
  assert.equal(targetMatchesDomain('example.bg', 'example.com'), false);
});

test('native keyword extraction surfaces important heading phrases without market-volume claims', () => {
  const rows = extractKeywordCandidates([page()], 12);
  assert.ok(rows.some((row) => row.keyword === 'уеб дизайн'));
  assert.ok(rows.every((row) => typeof row.coverage === 'number' && !('searchVolume' in row)));
});

test('native SEO scoring rewards stronger measurable page hygiene', () => {
  const strong = scoreSeoPages([page()], 0).score;
  const weak = scoreSeoPages([page({ title: undefined, description: undefined, h1: [], canonical: undefined, schemaCount: 0, wordCount: 40, internalLinks: 0, genericAnchors: 3 })], 2).score;
  assert.ok(strong > weak);
  assert.ok(strong >= 80);
});
