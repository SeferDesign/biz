import test from 'node:test';
import assert from 'node:assert/strict';
import { recurringDate } from '../src/recurring/schedule.js';
import { startRecurringExpenseWorker } from '../src/jobs/recurring-expense-worker.js';

test('recurring dates preserve the original day when months have different lengths', () => {
  assert.equal(recurringDate('2025-01-31', 'month', 1, 1), '2025-02-28');
  assert.equal(recurringDate('2025-01-31', 'month', 1, 2), '2025-03-31');
  assert.equal(recurringDate('2025-02-28', 'month', 1, 1), '2025-03-28');
});

test('weekly, quarterly, and yearly recurring dates are calendar-based', () => {
  assert.equal(recurringDate('2026-01-30', 'week', 1, 1), '2026-02-06');
  assert.equal(recurringDate('2026-01-31', 'month', 3, 1), '2026-04-30');
  assert.equal(recurringDate('2024-02-29', 'year', 1, 1), '2025-02-28');
});

test('invalid recurring date arguments are rejected', () => {
  assert.throws(() => recurringDate('2026-02-30', 'month', 1, 1), /start date/);
  assert.throws(() => recurringDate('2026-01-01', 'day', 1, 1), /schedule/);
});

test('recurring expense worker runs a due check immediately on startup', async () => {
  let runs = 0;
  const stop = startRecurringExpenseWorker({ processDueRecurringExpenses: async () => { runs += 1; return 0; } });
  await new Promise((resolve) => setImmediate(resolve));
  stop();
  assert.equal(runs, 1);
});
