import assert from 'node:assert/strict';
import test from 'node:test';

import { finiteNumber, normalizeSeoTarget, targetMatchesDomain } from '../../src/modules/seo-intelligence/core.ts';

test('normalizeSeoTarget reduces URLs to a lowercase host', () => {
  assert.equal(normalizeSeoTarget('https://www.Example.BG/path?q=1'), 'example.bg');
  assert.equal(normalizeSeoTarget('example.bg/path'), 'example.bg');
});

test('targetMatchesDomain accepts the exact host and its subdomains', () => {
  assert.equal(targetMatchesDomain('example.bg', 'example.bg'), true);
  assert.equal(targetMatchesDomain('example.bg', 'shop.example.bg'), true);
  assert.equal(targetMatchesDomain('example.bg', 'example.com'), false);
});

test('finiteNumber safely normalizes missing or invalid API metrics', () => {
  assert.equal(finiteNumber('42'), 42);
  assert.equal(finiteNumber(undefined), 0);
  assert.equal(finiteNumber('not-a-number', 7), 7);
});
