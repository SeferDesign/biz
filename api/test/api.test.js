import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/routing/app.js';
import { createMemoryStore } from '../test-support/memory-store.js';

function createTestApp() {
  return createApp({ store: createMemoryStore() });
}

test('GET /v1/invoices returns an invoice list', async () => {
  const app = createTestApp();

  const response = await request(app).get('/v1/invoices');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

test('legacy year endpoints return records and report totals', async () => {
  const app = createTestApp();

  const years = await request(app).get('/years');
  const income = await request(app).get('/years/2025/income');
  const yearExpenses = await request(app).get('/years/2025/expenses');
  const year = await request(app).get('/years/2025');
  const edit = await request(app).get('/years/1/edit');
  const form = await request(app).get('/years/new');

  assert.equal(years.status, 200);
  assert.equal(years.body[0].year, 2025);
  assert.equal(income.body.total, 2150);
  assert.equal(yearExpenses.body.total, 102.49);
  assert.equal(year.body.net_income, 2047.51);
  assert.equal(edit.body.year.year, 2025);
  assert.equal(form.body.year.goals_months.length, 12);
  assert.equal((await request(app).get('/years/1900')).status, 404);
});

test('legacy invoice, expense, and vendor endpoints return useful responses', async () => {
  const app = createTestApp();

  const email = await request(app).get('/invoices/1/email');
  const invalidStripe = await request(app).get('/invoices/1/stripe');
  const expenseList = await request(app).get('/expenses?inactive=true');
  const vendorList = await request(app).get('/vendors');

  assert.equal(email.status, 200);
  assert.equal(email.body.status, 'queued');
  assert.equal(invalidStripe.status, 400);
  assert.equal(expenseList.status, 200);
  assert.equal(expenseList.body.length, 2);
  assert.equal(vendorList.status, 200);
  assert.deepEqual(vendorList.body.map((vendor) => vendor.name), ['Adobe', 'Office Depot']);
  assert.equal((await request(app).get('/invoices/999/email')).status, 404);
});

test('clients, vendors, years, and expenses support validated CRUD', async () => {
  const app = createTestApp();

  assert.equal((await request(app).post('/v1/clients').send({ contact: 'No name' })).status, 400);
  const createdClient = await request(app).post('/v1/clients').send({
    name: 'Bright Studio',
    contact: 'Jamie Bright',
    email_accounting: 'billing@bright.example'
  });
  assert.equal(createdClient.status, 201);
  assert.equal((await request(app).get(`/v1/clients/${createdClient.body.id}`)).body.name, 'Bright Studio');
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ city: 'Chicago' })).body.city, 'Chicago');
  assert.equal((await request(app).delete(`/v1/clients/${createdClient.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/clients/${createdClient.body.id}`)).status, 404);

  const createdVendor = await request(app).post('/vendors').send({ name: 'Studio Supply', category: 'Supplies' });
  assert.equal(createdVendor.status, 201);
  assert.equal((await request(app).patch(`/vendors/${createdVendor.body.id}`).send({ notes: 'Local supplier' })).body.notes, 'Local supplier');
  assert.equal((await request(app).delete(`/vendors/${createdVendor.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/vendors/${createdVendor.body.id}`)).status, 404);

  assert.equal((await request(app).post('/years').send({ year: 'not-a-year' })).status, 400);
  const createdYear = await request(app).post('/years').send({ year: 2026, taxrate: 0.3, goal_year: 36000 });
  assert.equal(createdYear.status, 201);
  assert.equal(createdYear.body.goals_months.length, 12);
  assert.equal((await request(app).patch(`/years/${createdYear.body.id}`).send({ taxrate: 0.35 })).body.taxrate, 0.35);
  assert.equal((await request(app).delete(`/years/${createdYear.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/years/${createdYear.body.id}`)).status, 404);

  assert.equal((await request(app).post('/expenses').send({ name: 'Invalid expense' })).status, 400);
  const createdExpense = await request(app).post('/expenses').send({
    name: 'Domain renewal',
    vendor_id: 1,
    date: '2025-03-03',
    cost: 28.5,
    account: 'Business'
  });
  assert.equal(createdExpense.status, 201);
  assert.equal((await request(app).get(`/expenses/${createdExpense.body.id}`)).body.name, 'Domain renewal');
  assert.equal((await request(app).patch(`/expenses/${createdExpense.body.id}`).send({ cost: 30 })).body.cost, 30);
  assert.equal((await request(app).delete(`/expenses/${createdExpense.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/expenses/${createdExpense.body.id}`)).status, 404);
});

test('invoices support validated CRUD and cascade line removal', async () => {
  const app = createTestApp();

  assert.equal((await request(app).post('/v1/invoices').send({ client_id: 1 })).status, 400);
  const created = await request(app).post('/v1/invoices').send({
    client_id: 1,
    date: '2025-04-10',
    total: 750,
    description: 'Brand identity work',
    status: 'sent'
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'sent');
  const line = await request(app).post(`/v1/invoices/${created.body.id}/lines`).send({ description: 'Design', total: 750 });
  assert.equal(line.status, 201);
  assert.equal((await request(app).get(`/v1/invoices/${created.body.id}`)).body.description, 'Brand identity work');
  const updated = await request(app).patch(`/v1/invoices/${created.body.id}`).send({ status: 'paid', paiddate: '2025-04-12' });
  assert.equal(updated.body.status, 'paid');
  assert.equal(updated.body.paid, true);
  assert.equal((await request(app).patch(`/v1/invoices/${created.body.id}`).send({ status: 'unknown' })).status, 400);
  assert.equal((await request(app).delete(`/v1/invoices/${created.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/invoices/${created.body.id}`)).status, 404);
  assert.equal((await request(app).get(`/v1/invoices/${created.body.id}/lines`)).body.length, 0);
});

test('legacy chart routes preserve their expected response shapes', async () => {
  const app = createTestApp();

  const trailing = await request(app).get('/charts_controller/trailing_x_months/3');
  const monthly = await request(app).get('/charts_controller/year_invoice_month/2025');
  const monthlyGoals = await request(app).get('/charts_controller/year_invoice_month_with_goal/1');
  const allData = await request(app).get('/charts_controller/year_all_data/1');
  const categories = await request(app).get('/charts_controller/year_expense_category/1');
  const expenseMonths = await request(app).get('/charts_controller/year_expense_month/1');

  assert.deepEqual(trailing.body.map((item) => item.name), ['Invoices', 'Expenses', 'Goal']);
  assert.deepEqual(monthly.body.map((item) => item.name), ['Invoices']);
  assert.equal(monthly.body[0].data.Mar, 2150);
  assert.deepEqual(monthlyGoals.body.map((item) => item.name), ['Invoices', 'Goal']);
  assert.deepEqual(allData.body.map((item) => item.name), ['Invoices', 'Expenses', 'Goal']);
  assert.deepEqual(categories.body, [['Software', 59.99], ['Supplies', 42.5]]);
  assert.deepEqual(expenseMonths.body.map((item) => item.name), ['Expenses']);
  assert.equal((await request(app).get('/charts_controller/trailing_x_months/nope')).status, 400);
  assert.equal((await request(app).get('/charts_controller/year_all_data/1900')).status, 404);
});
