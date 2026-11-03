const numericFields = new Set([
  'account', 'client_id', 'cost', 'goal_year', 'hours', 'id', 'rate', 'taxrate', 'total', 'vendor_id', 'year'
]);
const booleanFields = new Set(['discount', 'hourly', 'international', 'paid']);

export const historyFields = {
  client: ['name', 'contact', 'site_url', 'logo', 'address1', 'address2', 'zipcode', 'city', 'state',
    'international', 'intinfo', 'email_accounting', 'email_accounting_2', 'email_accounting_3',
    'preferred_paymenttype', 'currentrate', 'payment_terms'],
  invoice: ['client_id', 'date', 'cost', 'paid', 'paiddate', 'paymenttype', 'description', 'status', 'currency'],
  invoiceLine: ['description', 'hours', 'rate', 'total', 'hourly', 'discount'],
  expense: ['name', 'vendor_id', 'date', 'cost', 'notes', 'account'],
  vendor: ['name', 'category', 'notes'],
  year: ['year', 'taxrate', 'goal_year', 'goals_months']
};

function normalizedValue(field, value) {
  if (value === undefined || value === null) return null;
  if (field === 'goals_months' && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (booleanFields.has(field)) return Boolean(value);
  if (numericFields.has(field) && value !== '' && Number.isFinite(Number(value))) return Number(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

export async function writeHistory(store, req, { entityType, entityId, action, changeMode = action, before, after, fields }) {
  const changes = {};
  for (const field of fields) {
    const oldValue = normalizedValue(field, before?.[field]);
    const newValue = normalizedValue(field, after?.[field]);
    if (oldValue === null && newValue === null) continue;
    if (changeMode === 'updated' && JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    if (changeMode === 'created' && after?.[field] === undefined) continue;
    if (changeMode === 'deleted' && before?.[field] === undefined) continue;
    changes[field] = {
      from: changeMode === 'created' ? null : oldValue,
      to: changeMode === 'deleted' ? null : newValue
    };
  }
  if (!Object.keys(changes).length) return null;
  return store.recordHistory({
    entity_type: entityType,
    entity_id: Number(entityId),
    action,
    actor_user_id: req.authUser?.id ?? null,
    actor_email: req.authUser?.email ?? null,
    source: req.authSource || 'api',
    changes
  });
}
