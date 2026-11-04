import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { NextRequest } from 'next/server.js';
import { requestOrigin, isSameOriginRequest } from '../lib/request-origin.js';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === 'next/server' ? 'next/server.js' : specifier, context);
  }
});
const { proxy } = await import('../proxy.js');
const { POST: redirectApiRequest } = await import('../app/api/[...path]/route.js');
hooks.deregister();

function request(path = '/invoices?year=2026', token = 'signed-session') {
  return new NextRequest(`https://biz.example.test${path}`, {
    headers: token ? { Cookie: `biz_session=${token}` } : {}
  });
}

test('valid sessions pass through with an authenticated, bounded session check', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/v1/auth/session'));
    assert.equal(options.headers.Authorization, 'Bearer signed-session');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(null, { status: 200 });
  });

  const response = await proxy(request());
  assert.equal(response.headers.get('x-middleware-next'), '1');
});

test('API failures preserve sessions and recover without another login', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch');
  const failures = [
    () => new Response(null, { status: 503 }),
    () => new Response(null, { status: 500 }),
    () => new Response(null, { status: 429 }),
    () => { throw new TypeError('Connection refused'); },
    () => { throw new DOMException('Request timed out', 'TimeoutError'); }
  ];

  for (const fail of failures) {
    fetchMock.mock.mockImplementation(async () => fail());
    const response = await proxy(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('retry-after'), '5');
    assert.equal(response.headers.get('x-middleware-next'), null);
  }

  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 200 }));
  assert.equal((await proxy(request())).headers.get('x-middleware-next'), '1');
});

test('rejected sessions still redirect to login and preserve the destination', async (context) => {
  for (const status of [401, 403]) {
    context.mock.method(globalThis, 'fetch', async () => new Response(null, { status }));
    const response = await proxy(request());
    const destination = new URL(response.headers.get('location'));
    assert.equal(response.status, 307);
    assert.equal(destination.pathname, '/login');
    assert.equal(destination.searchParams.get('next'), '/invoices?year=2026');
  }
});

test('missing sessions redirect to login without fetching the API', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected API request');
  });
  assert.equal((await proxy(request('/settings', ''))).status, 307);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('health checks bypass authentication and API availability without redirects', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected API request');
  });
  for (const token of ['', 'invalid-session']) {
    const response = await proxy(request('/healthz', token));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('location'), null);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('public pages bypass session checks and valid record links remain accessible', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 200 }));
  for (const path of ['/login', '/forgot-password', '/reset-password', '/payment', '/payments', '/api/v1/auth/login']) {
    assert.equal((await proxy(request(path))).headers.get('x-middleware-next'), '1');
  }
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal((await proxy(request('/invoices/1?access_token=public-link', ''))).headers.get('x-middleware-next'), '1');
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('API redirects preserve methods, encoded paths, and raw query strings', async () => {
  const response = await redirectApiRequest(new NextRequest('https://biz.example.test/api/v1/clients?q=a%2Bb&next=%2Finvoices', {
    method: 'POST'
  }), { params: Promise.resolve({ path: ['v1', 'clients', 'a/b'] }) });
  assert.equal(response.status, 307);
  assert.ok(response.headers.get('location').endsWith('/v1/clients/a%2Fb?q=a%2Bb&next=%2Finvoices'));
});

test('request origins reuse Next URLs while preserving canonicalization and forwarded headers', (context) => {
  const previous = process.env.PUBLIC_APP_URL;
  delete process.env.PUBLIC_APP_URL;
  context.after(() => {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previous;
  });
  const incoming = new NextRequest('https://biz.example.test/settings', {
    headers: { host: 'biz.example.test', origin: 'https://biz.example.test' }
  });
  assert.equal(requestOrigin(incoming), 'https://biz.example.test');
  assert.equal(isSameOriginRequest(incoming), true);
  incoming.headers.set('origin', 'https://biz.example.test:443');
  assert.equal(isSameOriginRequest(incoming), true);
  incoming.headers.set('origin', 'https://attacker.example.test');
  assert.equal(isSameOriginRequest(incoming), false);
  incoming.headers.set('origin', 'not a URL');
  assert.equal(isSameOriginRequest(incoming), false);
  incoming.headers.set('x-forwarded-host', 'PUBLIC.example.test:443, internal:3000');
  incoming.headers.set('x-forwarded-proto', 'https, http');
  assert.equal(requestOrigin(incoming), 'https://public.example.test');
  assert.equal(requestOrigin(new Request('http://internal/settings', { headers: { host: 'internal' } })), 'http://internal');
  process.env.PUBLIC_APP_URL = 'https://configured.example.test/base';
  assert.equal(requestOrigin(incoming), 'https://configured.example.test');
  assert.equal(requestOrigin(incoming), 'https://configured.example.test');
  process.env.PUBLIC_APP_URL = 'https://changed.example.test';
  assert.equal(requestOrigin(incoming), 'https://changed.example.test');
  process.env.PUBLIC_APP_URL = 'file:///tmp/index.html';
  incoming.headers.set('origin', 'null');
  assert.equal(isSameOriginRequest(incoming), false);
});
