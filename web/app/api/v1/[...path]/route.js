import { cookies } from 'next/headers';
import { isSameOriginRequest } from '../../../../lib/request-origin.js';

const apiBaseUrl = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:3000').replace(/\/$/, '');
const allowedResponseHeaders = ['content-type', 'content-disposition', 'cache-control'];

async function proxyApiRequest(request, context) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) && !isSameOriginRequest(request)) {
    return Response.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
  }

  const { path } = await context.params;
  const apiPath = path.map((segment) => encodeURIComponent(segment)).join('/');
  const target = new URL(`${apiBaseUrl}/v1/${apiPath}`);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const sessionToken = (await cookies()).get('biz_session')?.value;
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);

  const method = request.method.toUpperCase();
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer();
  try {
    const upstream = await fetch(target, { method, headers, body, cache: 'no-store' });
    const responseHeaders = new Headers();
    for (const name of allowedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch {
    return Response.json({ error: 'API service is unavailable.' }, { status: 502 });
  }
}

export const GET = proxyApiRequest;
export const HEAD = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
