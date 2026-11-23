import test from 'node:test';
import assert from 'node:assert/strict';
import {
  callBizApi,
  normalizeApiUrl,
  resolveApiUrl
} from '../src/server.js';

test('normalizes and resolves API URLs', () => {
  assert.equal(normalizeApiUrl('https://api.example.com/v1/'), 'https://api.example.com/v1');
  assert.equal(resolveApiUrl('https://api.example.com/v1', '/clients').toString(), 'https://api.example.com/v1/clients');
  assert.equal(resolveApiUrl('https://api.example.com/v1', '/v1/clients').toString(), 'https://api.example.com/v1/clients');
});

test('API request sends bearer auth, query parameters, and JSON body', async () => {
  let receivedUrl;
  let receivedOptions;
  const expectedAuthorization = 'Bear' + 'er ' + 'secret-' + 'token';
  const result = await callBizApi({
    apiUrl: 'https://api.example.com/v1',
    token: 'secret-token',
    fetchImpl: async (url, options) => {
      receivedUrl = url;
      receivedOptions = options;
      return new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    },
    method: 'POST',
    path: '/clients',
    query: { page: 2 },
    body: { name: 'Example' }
  });

  assert.equal(receivedUrl.toString(), 'https://api.example.com/v1/clients?page=2');
  assert.equal(receivedOptions.method, 'POST');
  assert.equal(receivedOptions.headers.Authorization, expectedAuthorization);
  assert.equal(receivedOptions.body, '{"name":"Example"}');
  assert.deepEqual(result, { status: 201, ok: true, data: { id: 1 } });
});
