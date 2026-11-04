import { Router } from 'express';
import { hasText, isDate, isFiniteNumber, parseId } from '../shared/validation.js';
import { historyFields, writeHistory } from '../shared/history.js';

const intervalUnits = new Set(['week', 'month', 'year']);
const accountTypes = new Set(['Business', 'Personal']);
const editableFields = new Set([
  'name', 'vendor_id', 'cost', 'notes', 'account', 'interval_unit', 'interval_count', 'start_date', 'end_date', 'active'
]);

function validateRule(input) {
  if (!hasText(input.name)) return 'Expense name is required';
  if (!isDate(input.start_date)) return 'Start date must use YYYY-MM-DD';
  if (!parseId(input.vendor_id)) return 'Vendor is required';
  if (input.end_date && (!isDate(input.end_date) || input.end_date < input.start_date)) {
    return 'End date must be on or after the start date';
  }
  if (!isFiniteNumber(input.cost) || Number(input.cost) < 0) return 'Expense cost must be a non-negative number';
  if (!accountTypes.has(input.account)) return 'Account must be Business or Personal';
  if (!intervalUnits.has(input.interval_unit)) return 'Frequency must be weekly, monthly, or yearly';
  if (!Number.isInteger(Number(input.interval_count)) || Number(input.interval_count) < 1 || Number(input.interval_count) > 52) {
    return 'Frequency interval must be between 1 and 52';
  }
  return null;
}

function normalizeRule(input) {
  const normalized = { ...input };
  if (Object.hasOwn(input, 'vendor_id')) normalized.vendor_id = input.vendor_id ? Number(input.vendor_id) : null;
  if (Object.hasOwn(input, 'cost')) normalized.cost = Number(input.cost);
  if (Object.hasOwn(input, 'interval_count')) normalized.interval_count = Number(input.interval_count);
  if (Object.hasOwn(input, 'end_date')) normalized.end_date = input.end_date || null;
  if (Object.hasOwn(input, 'notes')) normalized.notes = input.notes?.trim() || null;
  return normalized;
}

export default function recurringExpensesRouter(store) {
  const router = Router();

  router.get('/recurring-expenses', async (req, res) => {
    return res.json(await store.listRecurringExpenseRules());
  });

  router.get('/recurring-expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Recurring expense id must be a positive integer' });
    const rule = await store.getRecurringExpenseRule(id);
    if (!rule) return res.status(404).json({ error: 'Recurring expense not found' });
    return res.json(rule);
  });

  router.post('/recurring-expenses', async (req, res) => {
    const error = validateRule(req.body || {});
    if (error) return res.status(400).json({ error });
    if (req.body.vendor_id && !await store.hasVendor(Number(req.body.vendor_id))) {
      return res.status(400).json({ error: 'Vendor not found' });
    }
    const result = await store.createRecurringExpenseRule(normalizeRule(req.body));
    await writeHistory(store, req, {
      entityType: 'expense', entityId: result.expense.id, action: 'created',
      after: result.expense, fields: historyFields.expense
    });
    return res.status(201).json(result);
  });

  router.patch('/recurring-expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Recurring expense id must be a positive integer' });
    const current = await store.getRecurringExpenseRule(id);
    if (!current) return res.status(404).json({ error: 'Recurring expense not found' });
    const input = req.body || {};
    if (!Object.keys(input).length || Object.keys(input).some((key) => !editableFields.has(key))) {
      return res.status(400).json({ error: 'Provide supported recurring expense fields' });
    }
    if (input.active !== undefined && typeof input.active !== 'boolean') {
      return res.status(400).json({ error: 'Active must be a boolean' });
    }
    const next = { ...current, ...input };
    const error = validateRule(next);
    if (error) return res.status(400).json({ error });
    if (input.vendor_id && !await store.hasVendor(Number(input.vendor_id))) {
      return res.status(400).json({ error: 'Vendor not found' });
    }
    return res.json(await store.updateRecurringExpenseRule(id, normalizeRule(input)));
  });

  router.delete('/recurring-expenses/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Recurring expense id must be a positive integer' });
    const result = await store.deleteRecurringExpenseRule(id);
    if (!result) return res.status(404).json({ error: 'Recurring expense not found' });
    await Promise.all(result.plannedExpenses.map((expense) => writeHistory(store, req, {
      entityType: 'expense', entityId: expense.id, action: 'deleted', before: expense, fields: historyFields.expense
    })));
    await store.recordHistory({
      entity_type: 'recurring_expense',
      entity_id: id,
      action: 'deleted',
      actor_user_id: req.authUser?.id ?? null,
      actor_email: req.authUser?.email ?? null,
      source: req.authSource || 'api',
      changes: { name: { from: result.rule.name, to: null }, active: { from: Boolean(result.rule.active), to: null } }
    });
    return res.sendStatus(204);
  });

  return router;
}
