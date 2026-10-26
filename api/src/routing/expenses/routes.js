import { Router } from 'express';
import { hasText, isDate, isFiniteNumber, parseId } from '../shared/validation.js';

const expenseAccountTypes = new Set(['Business', 'Personal']);

function isExpenseAccount(value) {
  return value === undefined || value === null || value === '' || expenseAccountTypes.has(value);
}

export default function expensesRouter(store) {
  const router = Router();

  router.get('/expenses', async (req, res) => {
    const expenses = (await store.getSnapshot()).expenses;
    if (req.query.all === 'true') {
      return res.json(expenses.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)));
    }
    const now = new Date().toISOString().slice(0, 10);
    const filtered = expenses.filter((expense) => {
      if (req.query.future === 'true') return expense.date > now;
      if (req.query.inactive === 'true') return expense.date <= now;
      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      return expense.date >= cutoff.toISOString().slice(0, 10) && expense.date <= now;
    });
    return res.json(filtered.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)));
  });

  router.post('/expenses/bulk', async (req, res) => {
    const expenses = req.body?.expenses;
    if (!Array.isArray(expenses) || expenses.length < 1 || expenses.length > 100) {
      return res.status(400).json({ error: 'Provide between 1 and 100 expenses' });
    }
    for (const expense of expenses) {
      const { name, date, cost, vendor_id: vendorId } = expense || {};
      if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
        return res.status(400).json({ error: 'Every row requires a name, valid date, and numeric cost' });
      }
      if (!isExpenseAccount(expense.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
      if (vendorId !== undefined && vendorId !== null && !parseId(vendorId)) {
        return res.status(400).json({ error: 'Vendor id must be a positive integer' });
      }
      if (vendorId && !await store.getVendor(Number(vendorId))) return res.status(400).json({ error: 'Vendor not found' });
    }
    const created = await store.createExpenses(expenses.map((expense) => ({ ...expense, cost: Number(expense.cost), vendor_id: expense.vendor_id ? Number(expense.vendor_id) : null })));
    return res.status(201).json({ expenses: created });
  });

  router.patch('/expenses/bulk', async (req, res) => {
    const expenses = req.body?.expenses;
    if (!Array.isArray(expenses) || expenses.length < 1 || expenses.length > 100) {
      return res.status(400).json({ error: 'Provide between 1 and 100 expenses' });
    }
    const ids = new Set();
    for (const expense of expenses) {
      if (!parseId(expense?.id)) return res.status(400).json({ error: 'Every row requires a valid expense id' });
      if (ids.has(Number(expense.id))) return res.status(400).json({ error: 'Expense ids must not be duplicated' });
      ids.add(Number(expense.id));
      const { name, date, cost, vendor_id: vendorId } = expense;
      if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
        return res.status(400).json({ error: 'Every row requires a name, valid date, and numeric cost' });
      }
      if (!isExpenseAccount(expense.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
      if (vendorId !== undefined && vendorId !== null && !parseId(vendorId)) {
        return res.status(400).json({ error: 'Vendor id must be a positive integer' });
      }
      if (vendorId && !await store.getVendor(Number(vendorId))) return res.status(400).json({ error: 'Vendor not found' });
    }
    const updated = await store.updateExpenses(expenses.map((expense) => ({ ...expense, id: Number(expense.id), cost: Number(expense.cost), vendor_id: expense.vendor_id ? Number(expense.vendor_id) : null })));
    if (!updated) return res.status(404).json({ error: 'One or more expenses were not found; no changes were saved' });
    return res.json({ expenses: updated });
  });

  router.get('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    const expense = await store.getExpense(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    return res.json(expense);
  });

  router.post('/expenses', async (req, res) => {
    const { name, date, cost, vendor_id: vendorId } = req.body || {};
    if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
      return res.status(400).json({ error: 'Expense name, valid date, and numeric cost are required' });
    }
    if (!isExpenseAccount(req.body?.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
    if (vendorId !== undefined && vendorId !== null && !parseId(vendorId)) {
      return res.status(400).json({ error: 'Vendor id must be a positive integer' });
    }
    if (vendorId && !await store.getVendor(Number(vendorId))) return res.status(400).json({ error: 'Vendor not found' });
    return res.status(201).json(await store.createExpense(req.body));
  });

  router.patch('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    const input = req.body || {};
    if (!Object.keys(input).length) return res.status(400).json({ error: 'At least one expense field is required' });
    if (input.name !== undefined && !hasText(input.name)) return res.status(400).json({ error: 'Expense name cannot be empty' });
    if (input.date !== undefined && !isDate(input.date)) return res.status(400).json({ error: 'Expense date must use YYYY-MM-DD' });
    if (input.cost !== undefined && !isFiniteNumber(input.cost)) return res.status(400).json({ error: 'Expense cost must be numeric' });
    if (!isExpenseAccount(input.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
    if (input.vendor_id !== undefined && input.vendor_id !== null) {
      if (!parseId(input.vendor_id)) return res.status(400).json({ error: 'Vendor id must be a positive integer' });
      if (!await store.getVendor(Number(input.vendor_id))) return res.status(400).json({ error: 'Vendor not found' });
    }
    const expense = await store.updateExpense(id, input);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    return res.json(expense);
  });

  router.put('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const { name, date, cost, vendor_id: vendorId } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
      return res.status(400).json({ error: 'Expense name, valid date, and numeric cost are required' });
    }
    if (!isExpenseAccount(req.body?.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
    if (vendorId !== undefined && vendorId !== null && !parseId(vendorId)) {
      return res.status(400).json({ error: 'Vendor id must be a positive integer' });
    }
    if (vendorId && !await store.getVendor(Number(vendorId))) return res.status(400).json({ error: 'Vendor not found' });
    const expense = await store.updateExpense(id, req.body);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    return res.json(expense);
  });

  router.delete('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    if (!await store.deleteExpense(id)) return res.status(404).json({ error: 'Expense not found' });
    return res.sendStatus(204);
  });

  return router;
}
