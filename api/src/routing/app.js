import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { MySqlStore } from '../db/store.js';
import clientsRouter from './clients/routes.js';
import expensesRouter from './expenses/routes.js';
import invoicesRouter from './invoices/routes.js';
import { createAuthRouter } from './auth.js';
import searchRouter from './search/routes.js';
import vendorsRouter from './vendors/routes.js';
import yearsRouter from './years/routes.js';
import stripeRouter, { createStripeWebhookHandler } from './stripe/routes.js';
import { timingSafeEqual } from 'node:crypto';
import { verifySessionToken } from '../auth/session.js';
import { createStripeClient } from '../payments/stripe.js';
import { sendPaymentNotification as deliverPaymentNotification } from '../email/payment-notification-mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function tokenMatches(candidate, expected) {
  if (typeof candidate !== 'string' || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

function createAuthenticationMiddleware(store, apiAccessToken) {
  return async (req, res, next) => {
    const bearerToken = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (tokenMatches(bearerToken || req.query.access_token, apiAccessToken)) return next();
    const sessionUser = verifySessionToken(bearerToken, apiAccessToken);
    if (sessionUser) {
      req.authUser = sessionUser;
      return next();
    }

    const isInvoiceCheckout = req.method === 'POST' && /^\/invoices\/\d+\/checkout$/.test(req.path);
    if ((req.method === 'GET' || isInvoiceCheckout) && typeof req.query.access_token === 'string') {
      const clientMatch = req.method === 'GET' && req.path.match(/^\/clients\/(\d+)$/);
      const invoiceMatch = req.path.match(/^\/invoices\/(\d+)(?:\/(?:stripe|pdf|payment-options|checkout))?$/);
      const invoiceLinesMatch = req.path.match(/^\/invoices\/(\d+)\/lines$/);
      const record = clientMatch
        ? await store.getClient(clientMatch[1])
        : invoiceMatch
          ? await store.getInvoice(invoiceMatch[1])
          : invoiceLinesMatch
            ? await store.getInvoice(invoiceLinesMatch[1])
          : null;
      if (record?.access_token && tokenMatches(req.query.access_token, record.access_token)) {
        req.recordAccess = { type: clientMatch ? 'client' : 'invoice', id: record.id };
        return next();
      }
    }

    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: 'Unauthorized' });
  };
}

export function createApp({
  store = new MySqlStore(),
  sendInvoiceEmail,
  sendResetEmail,
  apiAccessToken = process.env.API_ACCESS_TOKEN,
  otpSecretEncryptionKey = process.env.OTP_SECRET_ENCRYPTION_KEY,
  stripe = createStripeClient(),
  stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET,
  publicAppUrl = process.env.PUBLIC_APP_URL,
  sendPaymentNotification = deliverPaymentNotification,
  buildEnv = process.env.BUILD_ENV
} = {}) {
  const app = express();
  // Signature verification needs the raw request body.
  app.post('/v1/stripe/webhook', express.raw({ type: 'application/json' }),
    createStripeWebhookHandler(store, { stripe, webhookSecret: stripeWebhookSecret, notify: sendPaymentNotification }));
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

  if (buildEnv === 'local') {
    const openApiDocument = yaml.parse(
      fs.readFileSync(path.join(__dirname, '../openapi/openapi.yaml'), 'utf8')
    );

    app.get('/v1/openapi.json', (req, res) => {
      res.json(openApiDocument);
    });

    app.use('/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }
  app.get('/v1/health', (req, res) => res.json({ status: 'ok', service: 'api' }));
  const authenticationMiddleware = createAuthenticationMiddleware(store, apiAccessToken);
  app.use('/v1', (req, res, next) => {
    if (req.method === 'POST' && ['/auth/login', '/auth/password-reset', '/auth/password-reset/confirm'].includes(req.path)) return next();
    return authenticationMiddleware(req, res, next);
  });
  app.use('/v1/auth', createAuthRouter(store, { apiAccessToken, otpSecretEncryptionKey, sendResetEmail }));
  app.use('/v1', clientsRouter(store));
  app.use('/v1', invoicesRouter(store, { sendInvoiceEmail }));
  app.use('/v1', stripeRouter(store, { stripe, appUrl: publicAppUrl, notify: sendPaymentNotification }));
  app.use('/v1', yearsRouter(store));
  app.use('/v1', expensesRouter(store));
  app.use('/v1', vendorsRouter(store));
  app.use('/v1', searchRouter(store));

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
  });

  return app;
}

export default { createApp };
