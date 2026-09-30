export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
    const host = forwardedHost || request.headers.get('host');
    const protocol = forwardedProtocol || new URL(request.url).protocol.replace(/:$/, '');
    const expectedOrigin = process.env.PUBLIC_APP_URL
      ? new URL(process.env.PUBLIC_APP_URL).origin
      : new URL(`${protocol}://${host}`).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}