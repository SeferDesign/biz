import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { NextRequest } from 'next/server.js';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === 'next/server' ? 'next/server.js' : specifier, context);
  }
});
const { proxy } = await import('../proxy.js');
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

test('public pages bypass session checks and valid record links remain accessible', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 200 }));
  for (const path of ['/login', '/forgot-password', '/reset-password', '/payment', '/payments', '/api/v1/auth/login']) {
    assert.equal((await proxy(request(path))).headers.get('x-middleware-next'), '1');
  }
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal((await proxy(request('/invoices/1?access_token=public-link', ''))).headers.get('x-middleware-next'), '1');
  assert.equal(fetchMock.mock.callCount(), 1);
});
