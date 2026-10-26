export function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function isFiniteNumber(value) {
  return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
}
