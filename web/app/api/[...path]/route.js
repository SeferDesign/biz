import { NextResponse } from 'next/server';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_INTERNAL_URL || 'https://api.biz.loc:9443').replace(/\/$/, '');

async function redirectApiRequest(request, context) {
  const { path } = await context.params;
  const apiPath = path.map((segment) => encodeURIComponent(segment)).join('/');
  const target = new URL(`${apiBaseUrl}/${apiPath}`);
  target.search = new URL(request.url).search;
  return NextResponse.redirect(target, 307);
}

export const GET = redirectApiRequest;
export const HEAD = redirectApiRequest;
export const POST = redirectApiRequest;
export const PUT = redirectApiRequest;
export const PATCH = redirectApiRequest;
export const DELETE = redirectApiRequest;
