import { Router } from 'express';
import { findYear, invoiceAmount, sum, yearExpenses, yearIncome } from '../shared/finance.js';

export default function yearsRouter(store) {
  const router = Router();

  router.get('/years', async (req, res) => {
    const years = (await store.getSnapshot()).years;
    return res.json([...years].sort((left, right) => right.year - left.year));
  });

  router.get('/years/new', (req, res) => {
    res.json({ year: { year: new Date().getUTCFullYear(), taxrate: 0, goal_year: 0, goals_months: Array(12).fill(0) } });
  });

  router.get('/years/:id/income', async (req, res) => {
    const snapshot = await store.getSnapshot();
    const year = findYear(req.params.id, snapshot.years);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    const records = yearIncome(year.year, snapshot.invoices);
    return res.json({ year: year.year, invoices: records, total: sum(records.map(invoiceAmount)) });
  });

  router.get('/years/:id/expenses', async (req, res) => {
    const snapshot = await store.getSnapshot();
    const year = findYear(req.params.id, snapshot.years);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    const records = yearExpenses(year.year, snapshot.expenses);
    return res.json({ year: year.year, expenses: records, total: sum(records.map((expense) => expense.cost)) });
  });

  router.get('/years/:id/edit', async (req, res) => {
    const years = (await store.getSnapshot()).years;
    const year = findYear(req.params.id, years);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    return res.json({ year });
  });

  router.get('/years/:id', async (req, res) => {
    const snapshot = await store.getSnapshot();
    const year = findYear(req.params.id, snapshot.years);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    const income = sum(yearIncome(year.year, snapshot.invoices).map(invoiceAmount));
    const expenseTotal = sum(yearExpenses(year.year, snapshot.expenses).map((expense) => expense.cost));
    return res.json({
      ...year,
      income_total: income,
      expenses_total: expenseTotal,
      net_income: income - expenseTotal,
      tax_owed: income * year.taxrate
    });
  });

  return router;
}
