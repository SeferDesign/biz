import { NextResponse } from 'next/server';
import { isSameOriginRequest, requestOrigin } from '../../../../lib/request-origin.js';

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL('/login', requestOrigin(request)), 303);
  response.cookies.set('biz_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return response;
}
