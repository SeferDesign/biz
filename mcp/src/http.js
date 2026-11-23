import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';

const bearerPattern = /^Bearer\s+(.+)$/i;

function jsonRpcError(res, status, code, message) {
  return res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null });
}

// Stateless Streamable HTTP handler for Express. The caller's bearer token is
// forwarded to the API, so MCP clients get exactly the access their key grants.
export function createMcpHttpHandler({ apiUrl, openApiDocument }) {
  return async (req, res) => {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return jsonRpcError(res, 405, -32000, 'Method not allowed');
    }

    const token = bearerPattern.exec(req.headers.authorization || '')?.[1];
    if (!token) {
      res.set('WWW-Authenticate', 'Bearer');
      return jsonRpcError(res, 401, -32001, 'Bearer token required');
    }

    const server = createMcpServer({ apiUrl, token, openApiDocument });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request failed:', error.message);
      if (!res.headersSent) jsonRpcError(res, 500, -32603, 'Internal server error');
    }
  };
}
