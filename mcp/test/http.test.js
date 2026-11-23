import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpHttpHandler } from '../src/http.js';

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

test('HTTP MCP forwards the caller bearer token to the API and serves the spec in-process', async () => {
  const upstreamRequests = [];
  const upstream = http.createServer((req, res) => {
    upstreamRequests.push({ url: req.url, authorization: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([{ id: 1 }]));
  });
  const upstreamPort = await listen(upstream);

  const app = express();
  app.use(express.json());
  app.use('/v1/mcp', createMcpHttpHandler({
    apiUrl: `http://127.0.0.1:${upstreamPort}/v1`,
    openApiDocument: { openapi: '3.1.0' }
  }));
  const appServer = http.createServer(app);
  const appPort = await listen(appServer);
  const endpoint = new URL(`http://127.0.0.1:${appPort}/v1/mcp`);

  try {
    assert.equal((await fetch(endpoint, { method: 'POST' })).status, 401);
    assert.equal((await fetch(endpoint, { method: 'GET' })).status, 405);

    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { Authorization: 'Bearer caller-key' } }
    }));

    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ['biz_api_openapi', 'biz_api_request']);

    const result = await client.callTool({ name: 'biz_api_request', arguments: { path: '/clients' } });
    assert.deepEqual(JSON.parse(result.content[0].text), { status: 200, data: [{ id: 1 }] });
    assert.deepEqual(upstreamRequests, [{ url: '/v1/clients', authorization: 'Bearer caller-key' }]);

    const spec = await client.callTool({ name: 'biz_api_openapi', arguments: {} });
    assert.deepEqual(JSON.parse(spec.content[0].text), { openapi: '3.1.0' });
    await client.close();
  } finally {
    appServer.close();
    upstream.close();
  }
});
