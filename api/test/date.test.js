import test from 'node:test';
import assert from 'node:assert/strict';
import { businessDate } from '../src/date.js';

test('business date respects the configured timezone around UTC midnight', () => {
  assert.equal(businessDate(new Date('2026-11-03T03:30:00Z'), 'America/Chicago'), '2026-11-02');
  assert.equal(businessDate(new Date('2026-11-03T06:00:00Z'), 'America/Chicago'), '2026-11-03');
});