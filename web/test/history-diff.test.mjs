import test from 'node:test';
import assert from 'node:assert/strict';
import { formatHistoryValue, historyActorLabel, historyChangeSides, historyRecordLabel } from '../lib/history-diff.js';

test('history actors include full or partial names with email when available', () => {
  assert.equal(historyActorLabel({ actor_first_name: ' Alex ', actor_last_name: 'Smith', actor_email: 'alex@example.com' }), 'Alex Smith (alex@example.com)');
  assert.equal(historyActorLabel({ actor_first_name: 'Alex', actor_email: 'alex@example.com' }), 'Alex (alex@example.com)');
  assert.equal(historyActorLabel({ actor_last_name: 'Smith' }), 'Smith');
});

test('history actors fall back to email or source when names are missing', () => {
  assert.equal(historyActorLabel({ actor_first_name: ' ', actor_last_name: null, actor_email: 'alex@example.com' }), 'alex@example.com');
  assert.equal(historyActorLabel({ source: 'api_access_token' }), 'api access token');
});

test('history distinguishes empty values from zero and false', () => {
  for (const value of [null, undefined, '']) {
    assert.equal(formatHistoryValue(value), '(empty)');
  }
  assert.equal(formatHistoryValue(0), '0');
  assert.equal(formatHistoryValue(false), 'No');
  assert.equal(formatHistoryValue(true), 'Yes');
});

test('created and deleted records only show the relevant side of a diff', () => {
  for (const action of ['created', 'line_created']) {
    assert.deepEqual(historyChangeSides(action), ['to']);
  }
  for (const action of ['deleted', 'line_deleted']) {
    assert.deepEqual(historyChangeSides(action), ['from']);
  }
});

test('updates retain both sides including fields cleared to empty', () => {
  for (const action of ['updated', 'lines_replaced', 'payment_received']) {
    assert.deepEqual(historyChangeSides(action), ['from', 'to']);
  }
  assert.equal(formatHistoryValue(null), '(empty)');
});

test('history preserves multiline text and whitespace', () => {
  assert.equal(formatHistoryValue('First line\n  Second line'), 'First line\n  Second line');
});

test('history exposes all structured fields instead of summarizing line items', () => {
  const lines = [{ description: 'Design', quantity: 2, rate: 100, total: 200 }];
  assert.equal(formatHistoryValue(lines), JSON.stringify(lines, null, 2));
  assert.equal(formatHistoryValue({ status: 'paid' }), '{\n  "status": "paid"\n}');
  assert.equal(formatHistoryValue([]), '[]');
});

test('history labels identify clients, vendors, expenses, and invoice clients by name', () => {
  assert.equal(historyRecordLabel({ entity_type: 'client', entity_id: 1, entity_name: 'Acme' }), 'Acme');
  assert.equal(historyRecordLabel({ entity_type: 'vendor', entity_id: 2, entity_name: 'Adobe' }), 'Adobe');
  assert.equal(historyRecordLabel({ entity_type: 'expense', entity_id: 3, entity_name: 'Creative Cloud', vendor_name: 'Adobe' }), 'Creative Cloud / Adobe');
  assert.equal(historyRecordLabel({ entity_type: 'invoice', entity_id: 4, client_name: 'Acme' }), 'Acme / Invoice #4');
});

test('history labels use saved names for deleted records and tolerate missing relationships', () => {
  assert.equal(historyRecordLabel({ entity_type: 'client', entity_id: 1, changes: { name: { from: 'Acme', to: null } } }), 'Acme');
  assert.equal(historyRecordLabel({ entity_type: 'expense', entity_id: 2, entity_name: 'Supplies' }), 'Supplies');
  assert.equal(historyRecordLabel({ entity_type: 'expense', entity_id: 2 }), 'expense #2');
  assert.equal(historyRecordLabel({ entity_type: 'year', entity_id: 2026 }), '2026');
});
