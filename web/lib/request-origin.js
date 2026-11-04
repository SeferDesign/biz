let cachedAppUrl;
let cachedAppOrigin;

export function requestOrigin(request) {
  const configuredOrigin = process.env.PUBLIC_APP_URL;
  if (configuredOrigin) {
    if (configuredOrigin !== cachedAppUrl) {
      cachedAppOrigin = new URL(configuredOrigin).origin;
      cachedAppUrl = configuredOrigin;
    }
    return cachedAppOrigin;
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const host = forwardedHost || request.headers.get('host');
  const requestUrl = request.nextUrl || (!forwardedProtocol ? new URL(request.url) : null);
  const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);

  if (!host || !protocol) throw new Error('Unable to resolve request origin');
  if (requestUrl?.host === host && requestUrl.protocol === `${protocol}:`) return requestUrl.origin;
  return new URL(`${protocol}://${host}`).origin;
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const expectedOrigin = requestOrigin(request);
    return (origin === expectedOrigin && origin !== 'null') || new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
