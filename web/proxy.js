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
      cache: 'no-store'
    });
    return response.ok;
  } catch {
    return false;
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

function isTokenizedApiRequest(request) {
  if (!request.nextUrl.searchParams.get('access_token')) return false;
  const apiPath = request.nextUrl.pathname.replace(/^\/api\/v1(?=\/|$)/, '');
  if (request.method === 'POST') return /^\/invoices\/\d+\/checkout$/.test(apiPath);
  if (request.method !== 'GET') return false;
  return /^\/(?:clients\/\d+|invoices\/\d+(?:\/(?:pdf|stripe|lines|payment-options))?)$/.test(apiPath);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (['/login', '/forgot-password', '/reset-password', '/payment', '/payments'].includes(pathname) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('biz_session')?.value;
  if (pathname.startsWith('/api/v1/')) {
    if (request.method === 'POST' && ['/api/v1/auth/password-reset', '/api/v1/auth/password-reset/confirm'].includes(pathname)) {
      return NextResponse.next();
    }
    if (sessionToken && await isValidSession(sessionToken)) return NextResponse.next();
    if (isTokenizedApiRequest(request)) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (sessionToken && await isValidSession(sessionToken)) return NextResponse.next();
  if (await isValidRecordLink(request)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images/|favicon.ico|robots.txt).*)']
};
