import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { generateOtpSecret, generateTotpCode, validOtpTimestep } from '../src/auth/session.js';
import { seedUser } from '../src/db/seed.js';
import { createApp } from '../src/routing/app.js';
import { toCsv } from '../src/routing/shared/csv.js';
import { sendInvoiceEmail } from '../src/email/invoice-mailer.js';
import { sendPaymentNotification } from '../src/email/payment-notification-mailer.js';
import { createMemoryStore } from '../test-support/memory-store.js';

const TEST_API_ACCESS_TOKEN = 'test-api-token';

function encryptOtpSecret(secret, encryptionKey) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(encryptionKey, salt, 2000, 32, 'sha1');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return {
    encrypted_otp_secret: encrypted.toString('base64'),
    encrypted_otp_secret_iv: iv.toString('base64'),
    encrypted_otp_secret_salt: salt.toString('base64')
  };
}

function request(app) {
  const agent = supertest(app);
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = agent[method].bind(agent);
    agent[method] = (...args) => original(...args).set('Authorization', `Bearer ${TEST_API_ACCESS_TOKEN}`);
  }
  return agent;
}

function createTestApp(options = {}) {
  return createApp({ store: createMemoryStore(), apiAccessToken: TEST_API_ACCESS_TOKEN, buildEnv: 'local', ...options });
}

test('all API endpoints are exposed under /v1', async () => {
  const app = createTestApp();

  assert.equal((await request(app).get('/v1/health')).status, 200);
  assert.equal((await supertest(app).get('/v1/openapi.json')).status, 200);
  assert.equal((await supertest(app).get('/v1/docs/')).status, 200);
  assert.equal((await request(app).get('/health')).status, 404);
  assert.equal((await request(app).get('/clients')).status, 404);
  assert.equal((await request(app).get('/expenses')).status, 404);
});

test('Swagger is unavailable outside local builds while API routes remain authenticated', async () => {
  const app = createTestApp({ buildEnv: 'prod' });

  assert.equal((await supertest(app).get('/v1/openapi.json')).status, 401);
  assert.equal((await supertest(app).get('/v1/docs/')).status, 401);
  assert.equal((await request(app).get('/v1/openapi.json')).status, 404);
  assert.equal((await request(app).get('/v1/docs/')).status, 404);
  assert.equal((await supertest(app).get('/v1/invoices')).status, 401);
  assert.equal((await request(app).get('/v1/invoices')).status, 200);
});

test('API authentication protects resources while preserving public and access-token routes', async () => {
  const store = createMemoryStore();
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN });
  const client = await store.getClient(1);
  const invoice = await store.getInvoice(1);
  client.access_token = 'client-link-token';
  invoice.access_token = 'invoice-link-token';

  assert.equal((await supertest(app).get('/v1/health')).status, 200);
  assert.equal((await supertest(app).get('/v1/invoices')).status, 401);
  assert.equal((await supertest(app).get('/v1/invoices').set('Authorization', `Bearer ${TEST_API_ACCESS_TOKEN}`)).status, 200);
  assert.equal((await supertest(app).get('/v1/clients/1?access_token=client-link-token')).status, 200);
  assert.equal((await supertest(app).get('/v1/clients/1?access_token=wrong-token')).status, 401);
  assert.equal((await supertest(app).get('/v1/clients?access_token=client-link-token')).status, 401);
  assert.equal((await supertest(app).post('/v1/clients?access_token=client-link-token').send({ name: 'Blocked' })).status, 401);
  assert.equal((await supertest(app).get('/v1/invoices/1?access_token=invoice-link-token')).status, 200);
  assert.equal((await supertest(app).get('/v1/invoices/1/lines?access_token=invoice-link-token')).status, 200);
  assert.equal((await supertest(app).get('/v1/invoices/1/email?access_token=invoice-link-token')).status, 401);
  assert.equal((await supertest(app).post('/v1/invoices/1/access-token?access_token=invoice-link-token')).status, 401);

  client.stripe_customer_id = 'cus_private';
  client.currentrate = 150;
  client.payment_terms = 'Net 60';
  const publicInvoice = (await supertest(app).get('/v1/invoices/1?access_token=invoice-link-token')).body;
  assert.equal(publicInvoice.client.name, 'Acme Inc.');
  assert.equal(publicInvoice.client.payment_terms, 'Net 60');
  assert.equal(publicInvoice.status, 'due');
  assert.equal(publicInvoice.access_token, undefined);
  assert.equal(publicInvoice.client_id, undefined);
  const publicClient = (await supertest(app).get('/v1/clients/1?access_token=client-link-token')).body;
  assert.equal(publicClient.name, 'Acme Inc.');
  assert.equal(publicClient.payment_terms, 'Net 60');
  assert.equal(publicClient.stripe_customer_id, undefined);
  assert.equal(publicClient.currentrate, undefined);
  assert.equal(publicClient.access_token, undefined);
  const adminInvoice = (await supertest(app).get('/v1/invoices/1').set('Authorization', `Bearer ${TEST_API_ACCESS_TOKEN}`)).body;
  assert.equal(adminInvoice.access_token, 'invoice-link-token');
  const created = await supertest(app).post('/v1/invoices/2/access-token').set('Authorization', `Bearer ${TEST_API_ACCESS_TOKEN}`);
  assert.equal(created.body.access_token, 'invoice-token-2');
});

test('database API keys can authenticate requests and update last_used_at', async () => {
  const store = createMemoryStore();
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN });
  const user = {
    id: 70,
    email: 'apikey@example.test',
    encrypted_password: await bcrypt.hash('example123', 4),
    otp_required_for_login: false
  };
  store.users.push(user);
  await store.createApiKey(user.id, { label: 'CLI', key: 'managed-key-1' });

  const denied = await supertest(app).get('/v1/invoices').set('Authorization', 'Bearer wrong-key');
  assert.equal(denied.status, 401);

  const allowed = await supertest(app).get('/v1/invoices').set('Authorization', 'Bearer managed-key-1');
  assert.equal(allowed.status, 200);

  const [stored] = await store.getApiKeysByUser(user.id);
  assert.equal(Boolean(stored.last_used_at), true);
});

test('signed-in users can create, update, list, and delete API keys', async () => {
  const store = createMemoryStore();
  const user = {
    id: 71,
    email: 'owner-api-keys@example.test',
    encrypted_password: await bcrypt.hash('example123', 4),
    otp_required_for_login: false
  };
  store.users.push(user);
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN });

  const login = await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'example123' });
  const authorization = `Bearer ${login.body.access_token}`;

  assert.equal((await supertest(app).get('/v1/auth/api-keys')).status, 401);
  const created = await supertest(app).post('/v1/auth/api-keys').set('Authorization', authorization).send({
    label: 'Integration Key',
    key: 'integration-key-1'
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.label, 'Integration Key');
  assert.equal(created.body.key, 'integration-key-1');
  assert.equal(created.body.last_used_at, null);

  const duplicate = await supertest(app).post('/v1/auth/api-keys').set('Authorization', authorization).send({
    label: 'Duplicate',
    key: 'integration-key-1'
  });
  assert.equal(duplicate.status, 409);

  const listed = await supertest(app).get('/v1/auth/api-keys').set('Authorization', authorization);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.length, 1);

  const updated = await supertest(app)
    .patch(`/v1/auth/api-keys/${created.body.id}`)
    .set('Authorization', authorization)
    .send({ label: 'Production Key', key: 'integration-key-2' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.label, 'Production Key');
  assert.equal(updated.body.key, 'integration-key-2');

  assert.equal((await supertest(app).get('/v1/invoices').set('Authorization', 'Bearer integration-key-1')).status, 401);
  assert.equal((await supertest(app).get('/v1/invoices').set('Authorization', 'Bearer integration-key-2')).status, 200);

  const removed = await supertest(app)
    .delete(`/v1/auth/api-keys/${created.body.id}`)
    .set('Authorization', authorization);
  assert.equal(removed.status, 204);
  assert.equal((await supertest(app).get('/v1/auth/api-keys').set('Authorization', authorization)).body.length, 0);
});

test('legacy user credentials establish expiring API sessions and enforce OTP replay protection', async () => {
  const store = createMemoryStore();
  const apiAccessToken = TEST_API_ACCESS_TOKEN;
  const otpKey = 'legacy-otp-encryption-key-for-test';
  const user = {
    id: 7,
    email: 'owner@example.test',
    encrypted_password: await bcrypt.hash('correct horse', 4),
    otp_required_for_login: true,
    consumed_timestep: null,
    ...encryptOtpSecret('JBSWY3DPEHPK3PXP', otpKey)
  };
  store.users.push(user);
  const app = createApp({ store, apiAccessToken, otpSecretEncryptionKey: otpKey });

  assert.equal((await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'incorrect', otp_attempt: '000000' })).status, 401);
  assert.equal((await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'correct horse' })).status, 401);

  const otp = generateTotpCode('JBSWY3DPEHPK3PXP');
  const login = await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'correct horse', otp_attempt: otp });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.id, user.id);
  assert.equal((await supertest(app).get('/v1/auth/session').set('Authorization', `Bearer ${login.body.access_token}`)).status, 200);
  assert.equal((await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'correct horse', otp_attempt: otp })).status, 401);
});

test('seedUser creates the requested bcrypt account without replacing an existing account', async () => {
  const inserts = [];
  const database = {
    async execute(query, values) {
      inserts.push({ query, values });
    }
  };

  assert.equal(await seedUser(database), true);
  assert.equal(inserts.length, 1);
  assert.match(inserts[0].query, /ON DUPLICATE KEY UPDATE id = id/);
  assert.equal(inserts[0].values[0], 'rob@seferdesign.com');
  assert.equal(await bcrypt.compare('example123', inserts[0].values[1]), true);
});

test('web-managed OTP can be set up, enabled, required at login, and disabled', async () => {
  const store = createMemoryStore();
  const otpKey = 'web-otp-encryption-test-key';
  const user = {
    id: 8,
    email: 'rob@seferdesign.com',
    encrypted_password: await bcrypt.hash('example123', 4),
    otp_required_for_login: false,
    consumed_timestep: null
  };
  store.users.push(user);
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN, otpSecretEncryptionKey: otpKey });
  assert.equal((await supertest(app).get('/v1/auth/security')).status, 401);
  assert.equal((await supertest(app).post('/v1/auth/otp/setup').send({})).status, 401);
  const login = await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'example123' });
  const session = `Bearer ${login.body.access_token}`;

  const initial = await supertest(app).get('/v1/auth/security').set('Authorization', session);
  assert.deepEqual(initial.body, { otp_enabled: false, otp_configured: false });
  const setup = await supertest(app).post('/v1/auth/otp/setup').set('Authorization', session);
  assert.equal(setup.status, 200);
  assert.match(setup.body.secret, /^[A-Z2-7]{32}$/);
  assert.match(setup.body.otpauth_uri, /^otpauth:\/\/totp\//);

  const code = generateTotpCode(setup.body.secret);
  const enabled = await supertest(app).post('/v1/auth/otp/enable').set('Authorization', session).send({ otp_attempt: code });
  assert.deepEqual(enabled.body, { otp_enabled: true, otp_configured: true });
  assert.equal((await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'example123' })).status, 401);
  assert.equal((await supertest(app).post('/v1/auth/otp/disable').set('Authorization', session).send({ otp_attempt: '000000' })).status, 401);

  user.consumed_timestep = Math.floor(Date.now() / 30_000) - 1;
  assert.notEqual(validOtpTimestep(await store.getUserOtpSettings(user.id), generateTotpCode(setup.body.secret), otpKey), null);
  const disabled = await supertest(app).post('/v1/auth/otp/disable').set('Authorization', session)
    .send({ otp_attempt: generateTotpCode(setup.body.secret) });
  assert.deepEqual(disabled.body, { otp_enabled: false, otp_configured: false });
});

test('password reset is non-enumerating, single-use, and changes the Devise-compatible password', async () => {
  const store = createMemoryStore();
  const user = {
    id: 9,
    email: 'reset@example.test',
    encrypted_password: await bcrypt.hash('old-password', 4),
    otp_required_for_login: false
  };
  store.users.push(user);
  let resetEmail;
  const app = createApp({
    store,
    apiAccessToken: TEST_API_ACCESS_TOKEN,
    sendResetEmail: async (message) => { resetEmail = message; }
  });

  const unknown = await supertest(app).post('/v1/auth/password-reset').send({ email: 'unknown@example.test' });
  const requested = await supertest(app).post('/v1/auth/password-reset').send({ email: user.email });
  assert.equal(unknown.status, 202);
  assert.deepEqual(requested.body, unknown.body);
  assert.equal(resetEmail.email, user.email);
  assert.equal(resetEmail.token.length, 43);
  assert.notEqual(user.reset_password_token, resetEmail.token);

  const reset = await supertest(app).post('/v1/auth/password-reset/confirm').send({
    token: resetEmail.token,
    password: 'new-password'
  });
  assert.equal(reset.status, 200);
  assert.equal(await bcrypt.compare('new-password', user.encrypted_password), true);
  assert.equal(user.reset_password_token, null);
  assert.equal((await supertest(app).post('/v1/auth/password-reset/confirm').send({
    token: resetEmail.token,
    password: 'another-password'
  })).status, 400);
});

test('signed-in users can change passwords only after verifying the current password', async () => {
  const store = createMemoryStore();
  const user = {
    id: 10,
    email: 'change@example.test',
    encrypted_password: await bcrypt.hash('old-password', 4),
    otp_required_for_login: false
  };
  store.users.push(user);
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN });
  const login = await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'old-password' });
  const authorization = `Bearer ${login.body.access_token}`;

  assert.equal((await supertest(app).post('/v1/auth/password').send({ current_password: 'old-password', new_password: 'new-password' })).status, 401);
  assert.equal((await supertest(app).post('/v1/auth/password').set('Authorization', authorization)
    .send({ current_password: 'wrong-password', new_password: 'new-password' })).status, 401);
  assert.equal((await supertest(app).post('/v1/auth/password').set('Authorization', authorization)
    .send({ current_password: 'old-password', new_password: 'new-password' })).status, 200);
  assert.equal(await bcrypt.compare('new-password', user.encrypted_password), true);
});

test('signed-in users can view and update first and last name with blank defaults', async () => {
  const store = createMemoryStore();
  const user = {
    id: 11,
    email: 'profile@example.test',
    encrypted_password: await bcrypt.hash('example123', 4),
    otp_required_for_login: false
  };
  store.users.push(user);
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN });
  const login = await supertest(app).post('/v1/auth/login').send({ email: user.email, password: 'example123' });
  const authorization = `Bearer ${login.body.access_token}`;

  const profile = await supertest(app).get('/v1/auth/profile').set('Authorization', authorization);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.first_name, '');
  assert.equal(profile.body.user.last_name, '');

  const updated = await supertest(app).patch('/v1/auth/profile').set('Authorization', authorization).send({
    first_name: '  Rob  ',
    last_name: ' Sefer '
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.first_name, 'Rob');
  assert.equal(updated.body.user.last_name, 'Sefer');

  const session = await supertest(app).get('/v1/auth/session').set('Authorization', authorization);
  assert.equal(session.status, 200);
  assert.equal(session.body.user.first_name, 'Rob');
  assert.equal(session.body.user.last_name, 'Sefer');

  const blanked = await supertest(app).patch('/v1/auth/profile').set('Authorization', authorization).send({
    first_name: null,
    last_name: ''
  });
  assert.equal(blanked.status, 200);
  assert.equal(blanked.body.user.first_name, '');
  assert.equal(blanked.body.user.last_name, '');
});

test('GET /v1/invoices returns an invoice list', async () => {
  const app = createTestApp();

  const response = await request(app).get('/v1/invoices');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

test('GET /v1/clients starts with the 10 most recent clients by activity', async () => {
  const store = createMemoryStore();
  const app = createApp({ store, apiAccessToken: TEST_API_ACCESS_TOKEN });

  const created = [];
  for (let offset = 0; offset < 11; offset += 1) {
    created.push(await store.createClient({ name: `Recent Client ${offset + 1}` }));
  }

  for (let offset = 0; offset < created.length; offset += 1) {
    created[offset].created_at = `2026-01-${String(offset + 1).padStart(2, '0')}T00:00:00Z`;
  }

  const activityInvoice = await store.createInvoice({ client_id: created[0].id, total: 250, date: '2026-02-01' });
  activityInvoice.created_at = '2026-02-01T00:00:00Z';

  const response = await request(app).get('/v1/clients');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.slice(0, 10).map((client) => client.id), [
    created[0].id,
    created[10].id,
    created[9].id,
    created[8].id,
    created[7].id,
    created[6].id,
    created[5].id,
    created[4].id,
    created[3].id,
    created[2].id
  ]);
});

test('invoice PDF endpoint returns a downloadable PDF document', async () => {
  const app = createTestApp();
  const response = await request(app).get('/v1/invoices/1/pdf').buffer(true).parse((res, callback) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/pdf');
  assert.match(response.headers['content-disposition'], /attachment; filename="Invoice-0001\.pdf"/);
  assert.equal(response.body.subarray(0, 5).toString(), '%PDF-');
});

test('invoice email includes the generated invoice PDF attachment', async () => {
  let message;
  await sendInvoiceEmail({
    invoice: { id: 10, client_id: 1, date: '2025-04-10', cost: 125, currency: 'USD' },
    client: {
      name: 'Bright Studio', email: 'billing@bright.example',
      email_accounting_2: 'ap@bright.example', email_accounting_3: 'owner@bright.example',
      payment_terms: 'Net 90'
    },
    lines: [{ description: 'Design', hours: 1, rate: 125, total: 125 }]
  }, {
    async sendMail(value) {
      message = value;
    }
  });

  assert.equal(message.attachments.length, 1);
  assert.equal(message.attachments[0].filename, 'Invoice-0010.pdf');
  assert.equal(message.attachments[0].contentType, 'application/pdf');
  assert.equal(message.attachments[0].content.subarray(0, 5).toString(), '%PDF-');
  assert.match(message.text, /Payment terms: Net 90/);
  assert.deepEqual(message.cc, ['ap@bright.example', 'owner@bright.example']);
});

test('omni-search finds clients, vendors, expenses, invoices, and line items', async () => {
  const app = createTestApp();

  const client = await request(app).get('/v1/search?q=acme');
  const vendorAndExpense = await request(app).get('/v1/search?q=office');
  const line = await request(app).get('/v1/search?q=development');
  const empty = await request(app).get('/v1/search?q=nomatch');
  const tooShort = await request(app).get('/v1/search?q=a');

  assert.equal(client.status, 200);
  assert.equal(client.body.results[0].type, 'Client');
  assert.equal(client.body.results[0].href, '/clients/1');
  assert.deepEqual(vendorAndExpense.body.results.map((item) => item.type), ['Vendor', 'Expense']);
  assert.equal(line.body.results[0].type, 'Line item');
  assert.equal(line.body.results[0].href, '/invoices/1');
  assert.deepEqual(empty.body.results, []);
  assert.equal(tooShort.status, 400);
});

test('year endpoints return records and report totals', async () => {
  const app = createTestApp();

  const years = await request(app).get('/v1/years');
  const income = await request(app).get('/v1/years/2025/income');
  const yearExpenses = await request(app).get('/v1/years/2025/expenses');
  const year = await request(app).get('/v1/years/2025');
  const edit = await request(app).get('/v1/years/1/edit');
  const form = await request(app).get('/v1/years/new');

  assert.equal(years.status, 200);
  assert.equal(years.body[0].year, 2025);
  assert.equal(income.body.total, 2150);
  assert.equal(yearExpenses.body.total, 102.49);
  assert.equal(year.body.net_income, 2047.51);
  assert.equal(edit.body.year.year, 2025);
  assert.equal(form.body.year.goals_months.length, 12);
  assert.equal((await request(app).get('/v1/years/1900')).status, 404);
});

test('year CSV exports list paid invoices and expenses', async () => {
  const app = createTestApp();

  const income = await request(app).get('/v1/years/2025/income/csv');
  const expenses = await request(app).get('/v1/years/2025/expenses/csv');

  assert.equal(income.status, 200);
  assert.match(income.headers['content-type'], /^text\/csv/);
  assert.equal(income.headers['content-disposition'], 'attachment; filename="2025paidinvoices.csv"');
  assert.equal(income.text.split('\r\n')[0], 'Paid Date,Client,Amount,Payment Type,Description');
  assert.equal(expenses.headers['content-disposition'], 'attachment; filename="2025expenses.csv"');
  assert.equal(expenses.text.split('\r\n')[0], 'Date,Item,Vendor,Category,Account,Cost,Description');
  assert.ok(expenses.text.split('\r\n').length > 2);
  assert.equal((await request(app).get('/v1/years/1900/income/csv')).status, 404);
  assert.equal(toCsv(['A', 'B'], [['x, "y"', '=SUM(1)'], [-5, null]]), 'A,B\r\n"x, ""y""",\'=SUM(1)\r\n-5,\r\n');
});

test('invoice, expense, and vendor endpoints return useful responses', async () => {
  const deliveries = [];
  const app = createTestApp({ sendInvoiceEmail: async (message) => {
    deliveries.push(message);
    return { recipient: message.client.email };
  } });

  const email = await request(app).post('/v1/invoices/1/email');
  const invalidStripe = await request(app).get('/v1/invoices/1/stripe');
  const expenseList = await request(app).get('/v1/expenses?inactive=true');
  const vendorList = await request(app).get('/v1/vendors');

  assert.equal(email.status, 200);
  assert.equal(email.body.status, 'sent');
  assert.equal(email.body.recipient, 'billing@acme.com');
  assert.ok(email.body.email_send.sent_at);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].lines.length, 2);
  const resent = await request(app).post('/v1/invoices/1/email');
  const emailSends = await request(app).get('/v1/invoices/1/email-sends');
  assert.equal(resent.status, 200);
  assert.equal(emailSends.body.length, 2);
  assert.equal(emailSends.body[0].recipient, 'billing@acme.com');
  assert.ok(emailSends.body[0].sent_at);
  assert.equal(invalidStripe.status, 400);
  assert.equal(expenseList.status, 200);
  assert.equal(expenseList.body.length, 2);
  assert.equal(vendorList.status, 200);
  assert.deepEqual(vendorList.body.map((vendor) => vendor.name), ['Adobe', 'Office Depot']);
  assert.equal((await request(app).get('/v1/invoices/999/email')).status, 404);
});

test('invoice email failures are reported instead of claiming delivery', async () => {
  const app = createTestApp({ sendInvoiceEmail: async () => { throw new Error('SMTP unavailable'); } });
  const response = await request(app).post('/v1/invoices/1/email');

  assert.equal(response.status, 502);
  assert.deepEqual(response.body, { error: 'SMTP unavailable' });
  assert.deepEqual((await request(app).get('/v1/invoices/1/email-sends')).body, []);
});

function createFakeStripe() {
  const sessions = new Map();
  const created = [];
  const expired = [];
  return {
    sessions,
    created,
    expired,
    webhooks: new Stripe('sk_test_placeholder').webhooks,
    paymentIntents: {
      async retrieve(id) { return { id, last_payment_error: { message: 'The customer bank account has insufficient funds.' } }; }
    },
    customers: {
      async create() { return { id: 'cus_test' }; },
      async update() {}
    },
    checkout: {
      sessions: {
        async create(params) {
          const id = `cs_test_${created.length + 1}`;
          const session = { id, url: `https://checkout.stripe.com/c/pay/${id}`, status: 'open', payment_status: 'unpaid', metadata: params.metadata };
          sessions.set(id, session);
          created.push(params);
          return session;
        },
        async retrieve(id) {
          if (!sessions.has(id)) throw Object.assign(new Error('No such checkout session'), { code: 'resource_missing' });
          return sessions.get(id);
        },
        async expire(id) {
          sessions.get(id).status = 'expired';
          expired.push(id);
        }
      }
    }
  };
}

test('Stripe embedded checkout charges card fees, confirms payment, and accepts signed webhooks', async () => {
  const store = createMemoryStore();
  const stripe = createFakeStripe();
  const webhookSecret = 'whsec_test_secret';
  const app = createApp({
    store,
    apiAccessToken: TEST_API_ACCESS_TOKEN,
    stripe,
    stripeWebhookSecret: webhookSecret,
    publicAppUrl: 'https://biz.example.test',
    sendPaymentNotification: async () => {}
  });
  (await store.getInvoice(1)).access_token = 'invoice-link-token';

  const options = await supertest(app).get('/v1/invoices/1/payment-options?access_token=invoice-link-token');
  assert.equal(options.status, 200);
  assert.equal(options.body.enabled, true);
  assert.deepEqual(options.body.methods.map((method) => [method.method, method.fee_cents, method.total_cents]), [
    ['card', 3615, 123615],
    ['us_bank_account', 500, 120500]
  ]);
  const invoice = await store.getInvoice(1);
  invoice.cost = 100;
  const lowerAmountOptions = await supertest(app).get('/v1/invoices/1/payment-options?access_token=invoice-link-token');
  assert.deepEqual(lowerAmountOptions.body.methods.map((method) => [method.method, method.fee_cents, method.total_cents]), [
    ['card', 330, 10330],
    ['us_bank_account', 81, 10081]
  ]);
  invoice.cost = 1200;
  assert.equal((await supertest(app).post('/v1/invoices/1/checkout?access_token=wrong').send({ method: 'card' })).status, 401);
  assert.equal((await supertest(app).post('/v1/invoices/1/checkout?access_token=invoice-link-token').send({ method: 'paypal' })).status, 400);

  const card = await supertest(app).post('/v1/invoices/1/checkout?access_token=invoice-link-token').send({ method: 'card' });
  assert.equal(card.status, 201);
  assert.equal(card.body.url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  assert.equal(stripe.created[0].ui_mode, undefined);
  assert.equal(stripe.created[0].customer, 'cus_test');
  assert.deepEqual(stripe.created[0].line_items.map((item) => item.price_data.unit_amount), [120000, 3615]);
  assert.match(stripe.created[0].success_url, /^https:\/\/biz\.example\.test\/invoices\/1\?access_token=invoice-link-token&checkout_session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.equal(stripe.created[0].cancel_url, 'https://biz.example.test/invoices/1?access_token=invoice-link-token&checkout=canceled');

  const bank = await supertest(app).post('/v1/invoices/1/checkout?access_token=invoice-link-token').send({ method: 'us_bank_account' });
  assert.equal(bank.status, 201);
  assert.deepEqual(stripe.expired, ['cs_test_1']);
  assert.deepEqual(stripe.created[1].line_items.map((item) => [item.price_data.product_data.name, item.price_data.unit_amount]), [
    ['Invoice #0001', 120000],
    ['ACH processing fee', 500]
  ]);
  assert.equal((await store.getInvoice(1)).stripe_session_id, 'cs_test_2');

  const unpaid = await supertest(app).get('/v1/invoices/1/stripe?session_id=cs_test_2&access_token=invoice-link-token');
  assert.equal(unpaid.body.status, 'open');
  assert.equal((await supertest(app).get('/v1/invoices/2/stripe?session_id=cs_test_2').set('Authorization', `Bearer ${TEST_API_ACCESS_TOKEN}`)).status, 400);

  Object.assign(stripe.sessions.get('cs_test_2'), { status: 'complete', payment_status: 'paid' });
  const confirmed = await supertest(app).get('/v1/invoices/1/stripe?session_id=cs_test_2&access_token=invoice-link-token');
  assert.equal(confirmed.body.status, 'paid');
  assert.equal((await store.getInvoice(1)).paymenttype, 'Stripe ACH');
  assert.equal((await supertest(app).post('/v1/invoices/1/checkout?access_token=invoice-link-token').send({ method: 'card' })).status, 409);

  const payload = JSON.stringify({
    id: 'evt_test', object: 'event', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_9', object: 'checkout.session', payment_status: 'paid', metadata: { invoice_id: '2', payment_method: 'card' } } }
  });
  const badSignature = await supertest(app).post('/v1/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', 't=1,v1=bad').send(payload);
  assert.equal(badSignature.status, 400);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const webhook = await supertest(app).post('/v1/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', signature).send(payload);
  assert.equal(webhook.status, 200);
  assert.equal((await store.getInvoice(2)).status, 'paid');
  assert.equal((await store.getInvoice(2)).paymenttype, 'Stripe');
});

test('ACH payments are tracked from submission through success or failure', async () => {
  const store = createMemoryStore();
  const stripe = createFakeStripe();
  const webhookSecret = 'whsec_test_secret';
  const notifications = [];
  const app = createApp({
    store,
    apiAccessToken: TEST_API_ACCESS_TOKEN,
    stripe,
    stripeWebhookSecret: webhookSecret,
    publicAppUrl: 'https://biz.example.test',
    sendPaymentNotification: async (message) => { notifications.push(message); }
  });
  const sendEvent = (type, object) => {
    const payload = JSON.stringify({ id: `evt_${type}`, object: 'event', type, data: { object } });
    return supertest(app).post('/v1/stripe/webhook').set('Content-Type', 'application/json')
      .set('Stripe-Signature', stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })).send(payload);
  };
  const session = (id, invoiceId, paymentStatus) => ({
    id, object: 'checkout.session', payment_status: paymentStatus, payment_intent: `pi_${id}`,
    amount_total: 98050, currency: 'usd', metadata: { invoice_id: String(invoiceId), payment_method: 'us_bank_account' }
  });
  const auth = { Authorization: `Bearer ${TEST_API_ACCESS_TOKEN}` };

  assert.equal((await sendEvent('checkout.session.completed', session('cs_ach_1', 2, 'unpaid'))).status, 200);
  assert.equal((await store.getInvoice(2)).payment_status, 'processing');
  assert.notEqual((await store.getInvoice(2)).status, 'paid');
  const options = await supertest(app).get('/v1/invoices/2/payment-options').set(auth);
  assert.equal(options.body.enabled, false);
  assert.equal(options.body.processing, true);
  assert.equal((await supertest(app).post('/v1/invoices/2/checkout').set(auth).send({ method: 'card' })).status, 409);

  await sendEvent('checkout.session.async_payment_succeeded', session('cs_ach_1', 2, 'paid'));
  await sendEvent('checkout.session.completed', session('cs_ach_1', 2, 'unpaid'));
  const payments = (await supertest(app).get('/v1/invoices/2/payments').set(auth)).body;
  assert.equal(payments.length, 1);
  assert.equal(payments[0].status, 'succeeded');
  assert.equal(payments[0].amount, 980.5);
  assert.equal((await store.getInvoice(2)).paymenttype, 'Stripe ACH');

  await sendEvent('checkout.session.completed', session('cs_ach_2', 1, 'unpaid'));
  await sendEvent('checkout.session.async_payment_failed', session('cs_ach_2', 1, 'unpaid'));
  const failed = (await supertest(app).get('/v1/invoices/1/payments').set(auth)).body[0];
  assert.equal(failed.status, 'failed');
  assert.match(failed.failure_message, /insufficient funds/);
  assert.equal((await supertest(app).get('/v1/invoices/1/payment-options').set(auth)).body.enabled, true);
  assert.deepEqual(notifications.map(({ payment, invoice }) => [invoice.id, payment.status]), [
    [2, 'processing'], [2, 'succeeded'], [1, 'processing'], [1, 'failed']
  ]);
  assert.equal(notifications[0].client.name, 'Northwind');

  const sent = [];
  await sendPaymentNotification({ ...notifications[0], livemode: false }, { sendMail: async (mail) => sent.push(mail) });
  assert.match(sent[0].subject, /ACH payment submitted: Invoice #0002 \(Northwind, \$980\.50\)/);
  assert.match(sent[0].text, /dashboard\.stripe\.com\/test\/payments\/pi_cs_ach_1/);
});

test('clients, vendors, years, and expenses support validated CRUD', async () => {
  const app = createTestApp();

  assert.equal((await request(app).post('/v1/clients').send({ contact: 'No name' })).status, 400);
  const createdClient = await request(app).post('/v1/clients').send({
    name: 'Bright Studio',
    contact: 'Jamie Bright',
    email_accounting: 'billing@bright.example',
    email_accounting_2: 'ap@bright.example',
    email_accounting_3: 'owner@bright.example'
  });
  assert.equal(createdClient.status, 201);
  assert.equal(createdClient.body.payment_terms, 'Net 15');
  assert.equal(createdClient.body.email_accounting_2, 'ap@bright.example');
  assert.equal(createdClient.body.email_accounting_3, 'owner@bright.example');
  assert.equal((await request(app).get(`/v1/clients/${createdClient.body.id}`)).body.name, 'Bright Studio');
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ payment_terms: 'Net 60' })).body.payment_terms, 'Net 60');
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ payment_terms: 'Net 45' })).status, 400);
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ preferred_paymenttype: 'Credit Card' })).body.preferred_paymenttype, 'Credit Card');
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ preferred_paymenttype: 'Wire transfer' })).status, 400);
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ preferred_paymenttype: '' })).body.preferred_paymenttype, null);
  assert.equal((await request(app).patch(`/v1/clients/${createdClient.body.id}`).send({ city: 'Chicago' })).body.city, 'Chicago');
  assert.equal((await request(app).delete(`/v1/clients/${createdClient.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/clients/${createdClient.body.id}`)).status, 404);

  const createdVendor = await request(app).post('/v1/vendors').send({ name: 'Studio Supply', category: 'Supplies' });
  assert.equal(createdVendor.status, 201);
  assert.equal((await request(app).patch(`/v1/vendors/${createdVendor.body.id}`).send({ notes: 'Local supplier' })).body.notes, 'Local supplier');
  assert.equal((await request(app).delete(`/v1/vendors/${createdVendor.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/vendors/${createdVendor.body.id}`)).status, 404);

  assert.equal((await request(app).post('/v1/years').send({ year: 'not-a-year' })).status, 400);
  const createdYear = await request(app).post('/v1/years').send({ year: 2026, taxrate: 0.3, goal_year: 36000 });
  assert.equal(createdYear.status, 201);
  assert.equal(createdYear.body.goals_months.length, 12);
  assert.equal((await request(app).patch(`/v1/years/${createdYear.body.id}`).send({ taxrate: 0.35 })).body.taxrate, 0.35);
  assert.equal((await request(app).delete(`/v1/years/${createdYear.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/years/${createdYear.body.id}`)).status, 404);

  assert.equal((await request(app).post('/v1/expenses').send({ name: 'Invalid expense' })).status, 400);
  assert.equal((await request(app).post('/v1/expenses').send({ name: 'Invalid account', date: '2025-03-03', cost: 20, account: 'Personal-ish' })).status, 400);
  const createdExpense = await request(app).post('/v1/expenses').send({
    name: 'Domain renewal',
    vendor_id: 1,
    date: '2025-03-03',
    cost: 28.5,
    account: 'Business'
  });
  assert.equal(createdExpense.status, 201);
  assert.equal((await request(app).get(`/v1/expenses/${createdExpense.body.id}`)).body.name, 'Domain renewal');
  assert.equal((await request(app).patch(`/v1/expenses/${createdExpense.body.id}`).send({ cost: 30 })).body.cost, 30);
  assert.equal((await request(app).delete(`/v1/expenses/${createdExpense.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/expenses/${createdExpense.body.id}`)).status, 404);
});

test('expenses support transactional bulk creation and updates', async () => {
  const app = createTestApp();
  const before = await request(app).get('/v1/expenses?all=true');
  const created = await request(app).post('/v1/expenses/bulk').send({ expenses: [
    { name: 'Annual hosting', vendor_id: 1, date: '2025-06-01', cost: 120, account: 'Business' },
    { name: 'Domain renewal', vendor_id: 2, date: '2025-06-02', cost: 18, account: 'Business' }
  ] });

  assert.equal(created.status, 201);
  assert.equal(created.body.expenses.length, 2);
  assert.equal((await request(app).get('/v1/expenses?all=true')).body.length, before.body.length + 2);

  const updated = await request(app).patch('/v1/expenses/bulk').send({ expenses: created.body.expenses.map((expense) => ({
    ...expense,
    cost: Number(expense.cost) + 1
  })) });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body.expenses.map((expense) => expense.cost), [121, 19]);

  const missingRow = await request(app).patch('/v1/expenses/bulk').send({ expenses: [
    { ...updated.body.expenses[0], cost: 999 },
    { ...updated.body.expenses[1], id: 999, cost: 999 }
  ] });
  assert.equal(missingRow.status, 404);
  assert.equal((await request(app).get(`/v1/expenses/${updated.body.expenses[0].id}`)).body.cost, 121);
  assert.equal((await request(app).post('/v1/expenses/bulk').send({ expenses: [{ name: 'Missing fields' }] })).status, 400);
});

test('invoices support validated CRUD and cascade line removal', async () => {
  const app = createTestApp();

  assert.equal((await request(app).post('/v1/invoices').send({ client_id: 1 })).status, 400);
  const created = await request(app).post('/v1/invoices').send({
    client_id: 1,
    date: '2025-04-10',
    total: 750,
    description: 'Brand identity work',
    status: 'sent'
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'sent');
  const line = await request(app).post(`/v1/invoices/${created.body.id}/lines`).send({ description: 'Design', total: 750 });
  assert.equal(line.status, 201);
  assert.equal((await request(app).get(`/v1/invoices/${created.body.id}`)).body.description, 'Brand identity work');
  const updated = await request(app).patch(`/v1/invoices/${created.body.id}`).send({ status: 'paid', paiddate: '2025-04-12' });
  assert.equal(updated.body.status, 'paid');
  assert.equal(updated.body.paid, true);
  assert.equal((await request(app).patch(`/v1/invoices/${created.body.id}`).send({ status: 'unknown' })).status, 400);
  assert.equal((await request(app).delete(`/v1/invoices/${created.body.id}`)).status, 204);
  assert.equal((await request(app).get(`/v1/invoices/${created.body.id}`)).status, 404);
  assert.equal((await request(app).get(`/v1/invoices/${created.body.id}/lines`)).body.length, 0);
});

test('invoice lines can be replaced on edit and invalid replacements are rejected', async () => {
  const app = createTestApp();
  const endpoint = '/v1/invoices/1/lines';

  const updated = await request(app).put(endpoint).send([
    { description: 'Updated design', hours: 2, rate: 150, total: 300 },
    { description: 'Hosting', total: 25 }
  ]);
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body.map((line) => [line.description, line.total]), [
    ['Updated design', 300],
    ['Hosting', 25]
  ]);

  assert.equal((await request(app).put(endpoint).send([{ description: 'Bad hours', hours: 'many' }])).status, 400);
  assert.deepEqual((await request(app).get(endpoint)).body.map((line) => line.description), ['Updated design', 'Hosting']);
  assert.deepEqual((await request(app).put(endpoint).send([])).body, []);
  assert.equal((await request(app).put('/v1/invoices/999/lines').send([])).status, 404);
});
