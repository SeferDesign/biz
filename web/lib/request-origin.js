export function requestOrigin(request) {
  const configuredOrigin = process.env.PUBLIC_APP_URL;
  if (configuredOrigin) return new URL(configuredOrigin).origin;

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const host = forwardedHost || request.headers.get('host');
  const protocol = forwardedProtocol || new URL(request.url).protocol.replace(/:$/, '');

  if (!host || !protocol) throw new Error('Unable to resolve request origin');
  return new URL(`${protocol}://${host}`).origin;
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const expectedOrigin = requestOrigin(request);
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
