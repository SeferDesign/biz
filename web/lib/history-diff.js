export function formatHistoryValue(value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function historyChangeSides(action) {
  if (action === 'created' || action.endsWith('_created')) return ['to'];
  if (action === 'deleted' || action.endsWith('_deleted')) return ['from'];
  return ['from', 'to'];
}

export function historyActorLabel(record) {
  const name = [record.actor_first_name, record.actor_last_name]
    .map((part) => part?.trim()).filter(Boolean).join(' ');
  if (name) return record.actor_email ? `${name} (${record.actor_email})` : name;
  return record.actor_email || record.source.replaceAll('_', ' ');
}

export function historyRecordLabel(record) {
  const savedName = record.changes?.name;
  const name = record.entity_name || savedName?.to || savedName?.from;
  if (record.entity_type === 'invoice') {
    return [record.client_name, `Invoice #${record.entity_id}`].filter(Boolean).join(' / ');
  }
  if (record.entity_type === 'expense' && name) {
    return [name, record.vendor_name].filter(Boolean).join(' / ');
  }
  if (name) return name;
  if (record.entity_type === 'year') {
    return String(record.changes?.year?.to || record.changes?.year?.from || record.entity_id);
  }
  return `${record.entity_type.replaceAll('_', ' ')} #${record.entity_id}`;
}
