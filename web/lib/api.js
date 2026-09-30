const apiBaseUrl = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.biz.loc:9443'
).replace(/\/$/, '');

const defaultApiVersion = 'v1';

export const browserApiBaseUrl = `/api/${defaultApiVersion}`;
export const recordsPerPage = 12;

export function parsePage(value) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export async function getApiData(path, { version = defaultApiVersion, accessToken } = {}) {
  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const versionPrefix = version ? `/${String(version).replace(/^\/+|\/+$/g, '')}` : '';
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    const response = await fetch(`${apiBaseUrl}${versionPrefix}${normalizedPath}`, { cache: 'no-store', headers });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return { error: body?.error || `API returned ${response.status}`, status: response.status };
    }
    return { data: body };
  } catch {
    return { error: 'The API is not reachable. Check that the API service is running.' };
  }
}

export function formatMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date);
}

export function invoiceStatus(invoice) {
  return invoice.status || (invoice.paid ? 'paid' : 'draft');
}
