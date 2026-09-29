import { Router } from 'express';
import { years } from '../shared/data.js';
import { findYear, invoiceAmount, sum, yearExpenses, yearIncome } from '../shared/finance.js';

const router = Router();

router.get('/years', (req, res) => res.json([...years].sort((left, right) => right.year - left.year)));

router.get('/years/new', (req, res) => {
  res.json({ year: { year: new Date().getUTCFullYear(), taxrate: 0, goal_year: 0, goals_months: Array(12).fill(0) } });
});

router.get('/years/:id/income', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const records = yearIncome(year.year);
  return res.json({ year: year.year, invoices: records, total: sum(records.map(invoiceAmount)) });
});

router.get('/years/:id/expenses', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const records = yearExpenses(year.year);
  return res.json({ year: year.year, expenses: records, total: sum(records.map((expense) => expense.cost)) });
});

router.get('/years/:id/edit', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  return res.json({ year });
});

router.get('/years/:id', (req, res) => {
  const year = findYear(req.params.id, years);
  if (!year) return res.status(404).json({ error: 'Year not found' });
  const income = sum(yearIncome(year.year).map(invoiceAmount));
  const expenseTotal = sum(yearExpenses(year.year).map((expense) => expense.cost));
  return res.json({
    ...year,
    income_total: income,
    expenses_total: expenseTotal,
    net_income: income - expenseTotal,
    tax_owed: income * year.taxrate
  });
});

export default router;