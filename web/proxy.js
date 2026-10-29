import { NextResponse } from 'next/server';

const apiBaseUrl = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://api:3000'
).replace(/\/$/, '');

async function isValidSession(token) {
  try {
    const response = await fetch(`${apiBaseUrl}/v1/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) return true;
    if (response.status === 401 || response.status === 403) return false;
    return null;
  } catch {
    return null;
  }
}

async function isValidRecordLink(request) {
  if (request.method !== 'GET') return false;
  const path = request.nextUrl.pathname;
  if (!/^\/(?:clients|invoices)\/\d+$/.test(path)) return false;
  const accessToken = request.nextUrl.searchParams.get('access_token');
  if (!accessToken) return false;

  try {
    const response = await fetch(`${apiBaseUrl}/v1${path}?access_token=${encodeURIComponent(accessToken)}`, {
      cache: 'no-store'
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (['/login', '/forgot-password', '/reset-password', '/payment', '/payments'].includes(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('biz_session')?.value;
  if (sessionToken) {
    const validSession = await isValidSession(sessionToken);
    if (validSession) return NextResponse.next();
    if (validSession === null) {
      return new NextResponse('Service temporarily unavailable. Please try again shortly.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': '5'
        }
      });
    }
  }
  if (await isValidRecordLink(request)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images/|favicon.ico|robots.txt).*)']
};
