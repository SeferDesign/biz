import { Router } from 'express';
import { expenseCategories, expenses, invoices, vendors, years } from '../shared/data.js';
import { findYear, invoiceAmount, invoiceDate, isPaid, monthlyAmount, series, yearExpenses } from '../shared/finance.js';

const router = Router();

router.get('/charts_controller/trailing_x_months/:number_of_months', (req, res) => {
  const monthCount = Number(req.params.number_of_months);
  if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 120) {
    return res.status(400).json({ error: 'number_of_months must be an integer between 1 and 120' });
  }
  const invoiceData = {};
  const expenseData = {};
  const goalData = {};
  const currentMonth = new Date();
  currentMonth.setUTCDate(1);
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - offset, 1));
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth() + 1;
    const label = monthDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    invoiceData[label] = monthlyAmount(invoices.filter(isPaid), year, month, invoiceDate, invoiceAmount);
    expenseData[label] = monthlyAmount(expenses, year, month, (expense) => expense.date, (expense) => expense.cost);
    goalData[label] = Number(years.find((item) => item.year === year)?.goals_months?.[month - 1] || 0);
  }
  return res.json([series('Invoices', invoiceData), series('Expenses', expenseData), series('Goal', goalData)]);
});

router.get('/charts_controller/year_invoice_month/:id', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const data = {};
  for (let month = 1; month <= 12; month += 1) {
    data[new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })] = monthlyAmount(invoices.filter(isPaid), year.year, month, invoiceDate, invoiceAmount);
  }
  return res.json([series('Invoices', data)]);
});

router.get('/charts_controller/year_invoice_month_with_goal/:id', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const invoiceData = {};
  const goalData = {};
  for (let month = 1; month <= 12; month += 1) {
    const label = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    invoiceData[label] = monthlyAmount(invoices.filter(isPaid), year.year, month, invoiceDate, invoiceAmount);
    goalData[label] = Number(year.goals_months?.[month - 1] || 0);
  }
  return res.json([series('Invoices', invoiceData), series('Goal', goalData)]);
});

router.get('/charts_controller/year_all_data/:id', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const invoiceData = {};
  const expenseData = {};
  const goalData = {};
  for (let month = 1; month <= 12; month += 1) {
    const label = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    invoiceData[label] = monthlyAmount(invoices.filter(isPaid), year.year, month, invoiceDate, invoiceAmount);
    expenseData[label] = monthlyAmount(yearExpenses(year.year), year.year, month, (expense) => expense.date, (expense) => expense.cost);
    goalData[label] = Number(year.goals_months?.[month - 1] || 0);
  }
  return res.json([series('Invoices', invoiceData), series('Expenses', expenseData), series('Goal', goalData)]);
});

router.get('/charts_controller/year_expense_category/:id', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const totals = new Map(expenseCategories.map((category) => [category, 0]));
  for (const expense of yearExpenses(year.year)) {
    const category = vendors.find((vendor) => vendor.id === expense.vendor_id)?.category;
    if (totals.has(category)) totals.set(category, totals.get(category) + Number(expense.cost || 0));
  }
  return res.json([...totals].filter(([, total]) => total > 0));
});

router.get('/charts_controller/year_expense_month/:id', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const data = {};
  for (let month = 1; month <= 12; month += 1) {
    const label = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    data[label] = monthlyAmount(yearExpenses(year.year), year.year, month, (expense) => expense.date, (expense) => expense.cost);
  }
  return res.json([series('Expenses', data)]);
});

export default router;
