import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { MySqlStore } from '../db/store.js';
import chartsRouter from './charts/routes.js';
import clientsRouter from './clients/routes.js';
import expensesRouter from './expenses/routes.js';
import invoicesRouter from './invoices/routes.js';
import vendorsRouter from './vendors/routes.js';
import yearsRouter from './years/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export function createApp({ store = new MySqlStore() } = {}) {
  const app = express();
  app.use(express.json());

  // The web client is served from a different host than the API.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    res.vary('Origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  const openApiDocument = yaml.parse(
    fs.readFileSync(path.join(__dirname, '../openapi/openapi.yaml'), 'utf8')
  );

  app.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api' }));

  app.use(clientsRouter(store));
  app.use(invoicesRouter(store));
  app.use(yearsRouter(store));
  app.use(expensesRouter(store));
  app.use(vendorsRouter(store));
  app.use(chartsRouter(store));

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
  });

  return app;
}

export default { createApp };
