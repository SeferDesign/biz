import test from 'node:test';
import assert from 'node:assert/strict';
import { activitySummaryRange, buildActivitySummary, sendActivitySummaryEmail } from '../src/email/activity-summary-mailer.js';

test('weekly summary covers today and the previous six UTC dates', () => {
  assert.deepEqual(activitySummaryRange('weekly', new Date('2025-04-06T08:00:00Z')), {
    start: '2025-03-31',
    end: '2025-04-06',
    title: 'Weekly Activity Summary'
  });
});

test('monthly summary covers the previous complete calendar month', () => {
  assert.deepEqual(activitySummaryRange('monthly', new Date('2025-04-01T08:00:00Z')), {
    start: '2025-03-01',
    end: '2025-03-31',
    title: 'Monthly Activity Summary'
  });
});

test('activity summary email includes paid, sent, and expense totals for the period', async () => {
  const sent = [];
  const result = await sendActivitySummaryEmail({
    period: 'weekly',
    now: new Date('2025-04-06T08:00:00Z'),
    recipient: 'owner@example.test',
    snapshot: {
      invoices: [
        { date: '2025-04-01', paid: true, paiddate: '2025-04-05', cost: 125.5 },
        { date: '2025-03-30', paid: true, paiddate: '2025-04-02', cost: 50 },
        { date: '2025-04-02', paid: false, cost: 75 }
      ],
      expenses: [
        { date: '2025-04-03', cost: 20 },
        { date: '2025-03-30', cost: 9 }
      ]
    }
  }, { sendMail: async (message) => sent.push(message) });

  assert.equal(result.recipient, 'owner@example.test');
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Weekly Activity Summary/);
  assert.match(sent[0].text, /Invoices Paid - 2 invoices totalling \$175\.50/);
  assert.match(sent[0].text, /Invoices Sent - 2 invoices totalling \$200\.50/);
  assert.match(sent[0].text, /Expenses - 1 expense\ntotalling \$20\.00/);
});

test('activity summary rejects unsupported periods', () => {
  assert.throws(() => buildActivitySummary({ period: 'daily' }), /weekly or monthly/);
});
