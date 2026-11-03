import { Router } from 'express';
import { hasText, isDate, isFiniteNumber, parseId, parsePagination } from '../shared/validation.js';
import { historyFields, writeHistory } from '../shared/history.js';

const expenseAccountTypes = new Set(['Business', 'Personal']);

function isExpenseAccount(value) {
  return value === undefined || value === null || value === '' || expenseAccountTypes.has(value);
}

function hasInternalExpenseFields(expense) {
  return expense?.is_planned !== undefined || expense?.recurring_rule_id !== undefined;
}

async function validateExpenseVendors(store, expenses) {
  if (expenses.some((expense) => !parseId(expense?.vendor_id))) return 'Every expense requires a vendor';
  const vendorIds = [...new Set(expenses
    .map((expense) => expense.vendor_id)
    .filter(Boolean)
    .map(Number))];
  const vendors = await Promise.all(vendorIds.map((vendorId) => store.getVendor(vendorId)));
  return vendors.some((vendor) => !vendor) ? 'Vendor not found' : null;
}

export default function expensesRouter(store) {
  const router = Router();

  router.get('/expenses', async (req, res) => {
    const pagination = parsePagination(req.query);
    if (pagination === false) return res.status(400).json({ error: 'Invalid pagination parameters' });
    if (pagination) {
      const filter = req.query.all === 'true' ? 'all' :
        req.query.future === 'true' ? 'future' : req.query.inactive === 'true' ? 'inactive' : 'recent';
      const result = await store.listExpenses({ ...pagination, filter });
      return res.json({ ...result, page: pagination.page, pageSize: pagination.pageSize });
    }
    const expenses = (await store.getSnapshot()).expenses;
    if (req.query.all === 'true') {
      return res.json(expenses.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)));
    }
    const now = new Date().toISOString().slice(0, 10);
    const filtered = expenses.filter((expense) => {
      if (req.query.future === 'true') return expense.date > now;
      if (req.query.inactive === 'true') return expense.date <= now && !expense.is_planned;
      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      return !expense.is_planned && expense.date >= cutoff.toISOString().slice(0, 10) && expense.date <= now;
    });
    return res.json(filtered.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)));
  });

  router.post('/expenses/bulk', async (req, res) => {
    const expenses = req.body?.expenses;
    if (!Array.isArray(expenses) || expenses.length < 1 || expenses.length > 100) {
      return res.status(400).json({ error: 'Provide between 1 and 100 expenses' });
    }
    for (const expense of expenses) {
      if (hasInternalExpenseFields(expense)) return res.status(400).json({ error: 'Planned fields are managed by recurring expenses' });
      const { name, date, cost, vendor_id: vendorId } = expense || {};
      if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
        return res.status(400).json({ error: 'Every row requires a name, valid date, and numeric cost' });
      }
      if (!isExpenseAccount(expense.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
      if (!parseId(vendorId)) return res.status(400).json({ error: 'Every expense requires a vendor' });
    }
    const vendorError = await validateExpenseVendors(store, expenses);
    if (vendorError) return res.status(400).json({ error: vendorError });
    const created = await store.createExpenses(expenses.map((expense) => ({ ...expense, cost: Number(expense.cost), vendor_id: expense.vendor_id ? Number(expense.vendor_id) : null })));
    await Promise.all(created.map((expense) => writeHistory(store, req, {
      entityType: 'expense', entityId: expense.id, action: 'created', after: expense, fields: historyFields.expense
    })));
    return res.status(201).json({ expenses: created });
  });

  router.patch('/expenses/bulk', async (req, res) => {
    const expenses = req.body?.expenses;
    if (!Array.isArray(expenses) || expenses.length < 1 || expenses.length > 100) {
      return res.status(400).json({ error: 'Provide between 1 and 100 expenses' });
    }
    const ids = new Set();
    for (const expense of expenses) {
      if (hasInternalExpenseFields(expense)) return res.status(400).json({ error: 'Planned fields are managed by recurring expenses' });
      if (!parseId(expense?.id)) return res.status(400).json({ error: 'Every row requires a valid expense id' });
      if (ids.has(Number(expense.id))) return res.status(400).json({ error: 'Expense ids must not be duplicated' });
      ids.add(Number(expense.id));
      const { name, date, cost, vendor_id: vendorId } = expense;
      if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
        return res.status(400).json({ error: 'Every row requires a name, valid date, and numeric cost' });
      }
      if (!isExpenseAccount(expense.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
      if (!parseId(vendorId)) return res.status(400).json({ error: 'Every expense requires a vendor' });
    }
    const vendorError = await validateExpenseVendors(store, expenses);
    if (vendorError) return res.status(400).json({ error: vendorError });
    const before = await store.getExpensesByIds(expenses.map((expense) => Number(expense.id)));
    const updated = await store.updateExpenses(expenses.map((expense) => ({ ...expense, id: Number(expense.id), cost: Number(expense.cost), vendor_id: expense.vendor_id ? Number(expense.vendor_id) : null })));
    if (!updated) return res.status(404).json({ error: 'One or more expenses were not found; no changes were saved' });
    const beforeById = new Map(before.map((expense) => [Number(expense.id), structuredClone(expense)]));
    await Promise.all(updated.map((expense) => writeHistory(store, req, {
      entityType: 'expense', entityId: expense.id, action: 'updated', before: beforeById.get(Number(expense.id)),
      after: expense, fields: historyFields.expense
    })));
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
    if (hasInternalExpenseFields(req.body)) return res.status(400).json({ error: 'Planned fields are managed by recurring expenses' });
    const { name, date, cost, vendor_id: vendorId } = req.body || {};
    if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
      return res.status(400).json({ error: 'Expense name, valid date, and numeric cost are required' });
    }
    if (!isExpenseAccount(req.body?.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
    if (!parseId(vendorId)) return res.status(400).json({ error: 'Vendor is required' });
    if (!await store.getVendor(Number(vendorId))) return res.status(400).json({ error: 'Vendor not found' });
    const expense = await store.createExpense(req.body);
    await writeHistory(store, req, { entityType: 'expense', entityId: expense.id, action: 'created', after: expense, fields: historyFields.expense });
    return res.status(201).json(expense);
  });

  router.patch('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    const input = req.body || {};
    if (!Object.keys(input).length) return res.status(400).json({ error: 'At least one expense field is required' });
    if (hasInternalExpenseFields(input)) return res.status(400).json({ error: 'Planned fields are managed by recurring expenses' });
    if (input.name !== undefined && !hasText(input.name)) return res.status(400).json({ error: 'Expense name cannot be empty' });
    if (input.date !== undefined && !isDate(input.date)) return res.status(400).json({ error: 'Expense date must use YYYY-MM-DD' });
    if (input.cost !== undefined && !isFiniteNumber(input.cost)) return res.status(400).json({ error: 'Expense cost must be numeric' });
    if (!isExpenseAccount(input.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
    const current = await store.getExpense(id);
    if (!current) return res.status(404).json({ error: 'Expense not found' });
    const resultingVendorId = input.vendor_id === undefined ? current.vendor_id : input.vendor_id;
    if (!parseId(resultingVendorId)) return res.status(400).json({ error: 'Vendor is required' });
    if (!await store.getVendor(Number(resultingVendorId))) return res.status(400).json({ error: 'Vendor not found' });
    const before = current ? structuredClone(current) : null;
    const expense = await store.updateExpense(id, input);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await writeHistory(store, req, { entityType: 'expense', entityId: id, action: 'updated', before, after: expense, fields: historyFields.expense });
    return res.json(expense);
  });

  router.put('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (hasInternalExpenseFields(req.body)) return res.status(400).json({ error: 'Planned fields are managed by recurring expenses' });
    const { name, date, cost, vendor_id: vendorId } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    if (!hasText(name) || !isDate(date) || !isFiniteNumber(cost)) {
      return res.status(400).json({ error: 'Expense name, valid date, and numeric cost are required' });
    }
    if (!isExpenseAccount(req.body?.account)) return res.status(400).json({ error: 'Account must be Business or Personal' });
    if (!parseId(vendorId)) return res.status(400).json({ error: 'Vendor is required' });
    if (!await store.getVendor(Number(vendorId))) return res.status(400).json({ error: 'Vendor not found' });
    const current = await store.getExpense(id);
    const before = current ? structuredClone(current) : null;
    const expense = await store.updateExpense(id, req.body);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    await writeHistory(store, req, { entityType: 'expense', entityId: id, action: 'updated', before, after: expense, fields: historyFields.expense });
    return res.json(expense);
  });

  router.delete('/expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Expense id must be a positive integer' });
    const before = await store.getExpense(id);
    if (!before || !await store.deleteExpense(id)) return res.status(404).json({ error: 'Expense not found' });
    await writeHistory(store, req, { entityType: 'expense', entityId: id, action: 'deleted', before, fields: historyFields.expense });
    return res.sendStatus(204);
  });

  return router;
}
