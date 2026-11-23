import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

export function normalizeApiUrl(apiUrl) {
  const base = (apiUrl || 'http://localhost:3001/v1').replace(/\/+$/, '');
  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error('BIZ_API_URL must be an absolute http or https URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('BIZ_API_URL must use http or https');
  }
  return base;
}

export function resolveApiUrl(apiUrl, requestPath) {
  if (typeof requestPath !== 'string' || !requestPath.startsWith('/')) {
    throw new Error('API path must start with /');
  }
  if (/^\/{2}/.test(requestPath) || /^[a-z][a-z\d+.-]*:/i.test(requestPath)) {
    throw new Error('API path must be relative');
  }

  const base = normalizeApiUrl(apiUrl);
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
  return requestPath.startsWith('/v1/')
    ? new URL(requestPath.slice(4), baseUrl)
    : new URL(requestPath.slice(1), baseUrl);
}

export async function callBizApi({
  apiUrl,
  token,
  fetchImpl = globalThis.fetch,
  method = 'GET',
  path,
  query,
  body
}) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');

  const url = resolveApiUrl(apiUrl, path);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetchImpl(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = text;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

export function createMcpServer({
  apiUrl = process.env.BIZ_API_URL,
  token = process.env.BIZ_API_TOKEN,
  openApiDocument
} = {}) {
  const server = new McpServer({
    name: 'seferbiz-api',
    version: '1.0.0'
  });

  server.registerTool('biz_api_request', {
    title: 'Call the Biz API',
    description: 'Make an authenticated HTTP request to the Biz REST API.',
    inputSchema: {
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
      path: z.string().startsWith('/').describe('API path, for example /clients or /v1/clients'),
      query: z.record(z.string(), z.unknown()).optional(),
      body: z.record(z.string(), z.unknown()).optional()
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    }
  }, async ({ method, path, query, body }) => {
    const result = await callBizApi({ apiUrl, token, method, path, query, body });
    return {
      isError: !result.ok,
      content: [{
        type: 'text',
        text: JSON.stringify({ status: result.status, data: result.data }, null, 2)
      }]
    };
  });

  server.registerTool('biz_api_openapi', {
    title: 'Read the Biz API specification',
    description: 'Fetch the public OpenAPI JSON document for the Biz REST API.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true
    }
  }, async () => {
    if (openApiDocument) {
      return { content: [{ type: 'text', text: JSON.stringify(openApiDocument, null, 2) }] };
    }
    const result = await callBizApi({
      apiUrl,
      token,
      method: 'GET',
      path: '/openapi.json'
    });
    return {
      isError: !result.ok,
      content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }]
    };
  });

  return server;
}

export async function main() {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
