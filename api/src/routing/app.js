import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import swaggerUi from 'swagger-ui-express';
import chartsRouter from './charts/routes.js';
import clientsRouter from './clients/routes.js';
import expensesRouter from './expenses/routes.js';
import invoicesRouter from './invoices/routes.js';
import vendorsRouter from './vendors/routes.js';
import yearsRouter from './years/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.use(express.json());

  const openApiDocument = yaml.parse(
    fs.readFileSync(path.join(__dirname, '../openapi/openapi.yaml'), 'utf8')
  );

  app.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api' }));

  app.use(clientsRouter);
  app.use(invoicesRouter);
  app.use(yearsRouter);
  app.use(expensesRouter);
  app.use(vendorsRouter);
  app.use(chartsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
  });

  return app;
}

export default { createApp };