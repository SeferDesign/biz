import test from 'node:test';
import assert from 'node:assert/strict';
import { expandInvoiceTemplate } from '../lib/invoice-template.js';

test('invoice template dates use local calendar days and zero-padded ISO dates', () => {
  const now = new Date(2026, 9, 30, 12, 0, 0);
  assert.equal(expandInvoiceTemplate('Issued {today}; work began {yesterday}.', now), 'Issued 2026-10-30; work began 2026-10-29.');
});

test('yesterday expansion crosses month and year boundaries', () => {
  assert.equal(expandInvoiceTemplate('{yesterday}', new Date(2026, 0, 1, 12, 0, 0)), '2025-12-31');
});

test('all supported variables expand while unknown placeholders stay unchanged', () => {
  assert.equal(expandInvoiceTemplate('{today} / {today} / {yesterday} / {client}', new Date(2026, 0, 2, 12, 0, 0)), '2026-01-02 / 2026-01-02 / 2026-01-01 / {client}');
});