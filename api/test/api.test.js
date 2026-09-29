import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/routing/app.js';

test('GET /v1/invoices returns an invoice list', async () => {
  const app = createApp();

  const response = await request(app).get('/v1/invoices');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

test('legacy year endpoints return records and report totals', async () => {
  const app = createApp();

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
  const app = createApp();

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

test('legacy chart routes preserve their expected response shapes', async () => {
  const app = createApp();

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
