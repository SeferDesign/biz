const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parsePagination(query) {
  if (query.page === undefined && query.page_size === undefined) return null;
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.page_size ?? 12);
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 ||
      pageSize > 100 || !Number.isSafeInteger(offset)) {
    return false;
  }
  return { page, pageSize, offset };
}

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isDate(value) {
  return typeof value === 'string'
    && datePattern.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function isFiniteNumber(value) {
  return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
}
