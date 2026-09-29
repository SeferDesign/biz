import { Router } from 'express';
import { findYear, invoiceAmount, sum, yearExpenses, yearIncome } from '../shared/finance.js';
import { isFiniteNumber, parseId } from '../shared/validation.js';

function validateYearInput(input, { partial = false } = {}) {
  if (!partial || input.year !== undefined) {
    if (!Number.isInteger(Number(input.year)) || Number(input.year) < 1900 || Number(input.year) > 9999) {
      return 'Year must be a four-digit calendar year';
    }
  }
  if (input.taxrate !== undefined && (!isFiniteNumber(input.taxrate) || Number(input.taxrate) < 0 || Number(input.taxrate) > 1)) {
    return 'Tax rate must be between 0 and 1';
  }
  if (input.goal_year !== undefined && (!isFiniteNumber(input.goal_year) || Number(input.goal_year) < 0)) {
    return 'Annual goal must be a non-negative number';
  }
  if (input.goals_months !== undefined
    && (!Array.isArray(input.goals_months)
      || input.goals_months.length !== 12
      || input.goals_months.some((goal) => !isFiniteNumber(goal) || Number(goal) < 0))) {
    return 'Monthly goals must contain 12 non-negative numbers';
  }
  return null;
}

export default function yearsRouter(store) {
  const router = Router();

  router.get('/years', async (req, res) => {
    const years = (await store.getSnapshot()).years;
    return res.json([...years].sort((left, right) => right.year - left.year));
  });

  router.get('/years/new', (req, res) => {
    res.json({ year: { year: new Date().getUTCFullYear(), taxrate: 0, goal_year: 0, goals_months: Array(12).fill(0) } });
  });

  router.post('/years', async (req, res) => {
    const input = {
      ...req.body,
      taxrate: req.body?.taxrate ?? 0,
      goal_year: req.body?.goal_year ?? 0,
      goals_months: req.body?.goals_months ?? Array(12).fill(0)
    };
    const error = validateYearInput(input);
    if (error) return res.status(400).json({ error });
    try {
      return res.status(201).json(await store.createYear(input));
    } catch (cause) {
      if (cause.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That year already exists' });
      throw cause;
    }
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

  router.patch('/years/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Year id must be a positive integer' });
    if (!Object.keys(req.body || {}).length) return res.status(400).json({ error: 'At least one year field is required' });
    const error = validateYearInput(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    try {
      const year = await store.updateYear(id, req.body);
      if (!year) return res.status(404).json({ error: 'Year not found' });
      return res.json(year);
    } catch (cause) {
      if (cause.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That year already exists' });
      throw cause;
    }
  });

  router.put('/years/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Year id must be a positive integer' });
    const input = {
      ...req.body,
      taxrate: req.body?.taxrate ?? 0,
      goal_year: req.body?.goal_year ?? 0,
      goals_months: req.body?.goals_months ?? Array(12).fill(0)
    };
    const error = validateYearInput(input);
    if (error) return res.status(400).json({ error });
    try {
      const year = await store.updateYear(id, input);
      if (!year) return res.status(404).json({ error: 'Year not found' });
      return res.json(year);
    } catch (cause) {
      if (cause.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That year already exists' });
      throw cause;
    }
  });

  router.delete('/years/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Year id must be a positive integer' });
    if (!await store.deleteYear(id)) return res.status(404).json({ error: 'Year not found' });
    return res.sendStatus(204);
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
