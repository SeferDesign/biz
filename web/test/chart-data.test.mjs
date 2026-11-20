import assert from 'node:assert/strict';
import test from 'node:test';
import { annualRunRate, monthlyRunRate } from '../lib/chart-data.js';

test('projected annual run rate projects paid income over the full calendar year', () => {
  const now = new Date('2024-02-29T18:00:00Z');

  assert.equal(annualRunRate(6000, 2024, now), 36600);
  assert.equal(monthlyRunRate(6000, 2024, now), 3050);
  assert.equal(annualRunRate(0, 2024, now), 0);
  assert.equal(annualRunRate(6000, 2025, now), null);
});
