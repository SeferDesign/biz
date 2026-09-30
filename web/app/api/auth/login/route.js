import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '../../../../lib/request-origin.js';

const apiBaseUrl = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:3000').replace(/\/$/, '');

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
  }

  const credentials = await request.json().catch(() => null);
  if (!credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  try {
    const apiResponse = await fetch(`${apiBaseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store'
    });
    const result = await apiResponse.json().catch(() => null);
    if (!apiResponse.ok) {
      return NextResponse.json({ error: result?.error || 'Sign-in failed.' }, { status: apiResponse.status });
    }

    const response = NextResponse.json({ user: result.user });
    response.cookies.set('biz_session', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: result.expires_in
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication service is unavailable.' }, { status: 503 });
  }
}
