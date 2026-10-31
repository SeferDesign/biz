import test from 'node:test';
import assert from 'node:assert/strict';

function configureEnvironment(context, values) {
  for (const [name, value] of Object.entries(values)) {
    const previous = process.env[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    context.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
}

test('browser API URLs use the public host while server requests use the internal host', async (context) => {
  configureEnvironment(context, {
    NEXT_PUBLIC_API_URL: 'https://api.example.test/',
    API_INTERNAL_URL: 'http://api:3000/'
  });
  const { browserApiBaseUrl, getApiData } = await import('../lib/api.js?configured');
  assert.equal(browserApiBaseUrl, 'https://api.example.test/v1');

  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://api:3000/v1/clients');
    assert.equal(options.headers.Authorization, 'Bearer signed-session');
    return Response.json([]);
  });
  assert.deepEqual(await getApiData('/clients', { accessToken: 'signed-session' }), { data: [] });
});

for (const [label, value] of [['missing', undefined], ['empty', ''], ['blank', '   ']]) {
  test(`browser API URLs reject ${label} public configuration instead of using a fallback`, async (context) => {
    configureEnvironment(context, {
      NEXT_PUBLIC_API_URL: value,
      API_INTERNAL_URL: 'http://api:3000'
    });
    await assert.rejects(import(`../lib/api.js?${label}`), /NEXT_PUBLIC_API_URL must be configured/);
  });
}

test('expense and invoice sorting is newest first, with invoice status as a secondary sort', async (context) => {
  configureEnvironment(context, { NEXT_PUBLIC_API_URL: 'https://example.test' });
  const { newestExpensesFirst, newestInvoicesFirst } = await import('../lib/api.js?sorting');

  const expenses = [
    { id: 1, date: '2026-01-01' },
    { id: 2, date: '2026-01-03' },
    { id: 3, date: '2026-01-02' }
  ];
  assert.deepEqual(expenses.toSorted(newestExpensesFirst).map((expense) => expense.id), [2, 3, 1]);

  const invoices = [
    { id: 1, date: '2026-01-03', status: 'paid' },
    { id: 2, date: '2026-01-03', status: 'sent' },
    { id: 3, date: '2026-01-03', status: 'draft' },
    { id: 4, date: '2026-01-04', status: 'paid' }
  ];
  assert.deepEqual(invoices.toSorted(newestInvoicesFirst).map((invoice) => invoice.id), [4, 3, 2, 1]);
});

test('invoice list groups drafts, sent, and paid before sorting newest first within each group', async (context) => {
  configureEnvironment(context, { NEXT_PUBLIC_API_URL: 'https://example.test' });
  const { invoicesByStatusFirst } = await import('../lib/api.js?status-sorting');

  const invoices = [
    { id: 1, date: '2026-01-03', status: 'paid' },
    { id: 2, date: '2026-01-03', status: 'sent' },
    { id: 3, date: '2026-01-01', status: 'draft' },
    { id: 4, date: '2026-01-04', paid: true },
    { id: 5, date: '2026-01-02' },
    { id: 6, date: '2026-01-03', status: 'SENT', payment_status: 'processing' },
    { id: 7, date: '2026-01-04', status: 'sent' },
    { id: 8, date: '2026-01-05', status: 'canceled' }
  ];
  assert.deepEqual(invoices.toSorted(invoicesByStatusFirst).map((invoice) => invoice.id), [5, 3, 7, 6, 2, 4, 1, 8]);
});

test('monthly chart goals prefer month targets and fall back to the annual goal', async () => {
  const { monthlyGoal, monthlyFinances } = await import('../lib/chart-data.js');
  const years = [{ year: 2025, goal_year: 24000, goals_months: [0, 3000] }];

  assert.equal(monthlyGoal(years, 2025, 1), 2000);
  assert.equal(monthlyGoal(years, 2025, 2), 3000);
  assert.equal(monthlyGoal(years, 2024, 1), null);
  assert.equal(monthlyFinances([{ key: '2025-01', year: 2025, month: 1, label: 'January' }], { years })[0].goal, 2000);
});
