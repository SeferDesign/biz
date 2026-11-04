import test from 'node:test';
import assert from 'node:assert/strict';
import { MySqlStore } from '../src/db/store.js';

test('access and existence checks select only their required columns', async () => {
  const queries = [];
  const store = new MySqlStore({
    async execute(sql) {
      queries.push(sql);
      return [[{ id: 1, client_id: 2, access_token: 'token' }]];
    }
  });
  assert.equal((await store.getClientAccess(1)).access_token, 'token');
  assert.equal((await store.getInvoiceAccess(1)).client_id, 2);
  assert.equal(await store.hasClient(1), true);
  assert.equal(await store.hasVendor(1), true);
  assert.equal(await store.hasInvoice(1), true);
  assert.equal(await store.ensureClientAccessToken(1), 'token');
  assert.equal(await store.ensureInvoiceAccessToken(1), 'token');
  assert.deepEqual(queries.filter((sql) => sql.startsWith('SELECT')), [
    'SELECT id, access_token FROM clients WHERE id = ?',
    'SELECT id, client_id, access_token FROM invoices WHERE id = ?',
    'SELECT id FROM clients WHERE id = ?',
    'SELECT id FROM vendors WHERE id = ?',
    'SELECT id FROM invoices WHERE id = ?',
    'SELECT id, access_token FROM clients WHERE id = ?',
    'SELECT id, client_id, access_token FROM invoices WHERE id = ?'
  ]);
});

test('snapshot projections query only requested tables and fields', async () => {
  const queries = [];
  const store = new MySqlStore({
    async query(sql) {
      queries.push(sql);
      return [[]];
    }
  });
  const snapshot = await store.getSnapshot({ clients: ['id', 'name'], invoices: ['date', 'total', 'status'] });
  assert.equal(queries.length, 2);
  assert.match(queries[0], /^SELECT `c`\.`id`, `c`\.`name`/);
  assert.match(queries[1], /^SELECT `invoices`\.`date`, cost AS total, CASE WHEN paid THEN 'paid' ELSE status END AS status/);
  assert.ok(queries.every((sql) => !sql.includes('.*') && !sql.includes('access_token')));
  assert.deepEqual(snapshot.expenses, []);
  assert.deepEqual(snapshot.years, []);
});

test('full snapshots quote reserved table names and partial years skip JSON normalization', async () => {
  const queries = [];
  const store = new MySqlStore({
    async query(sql) {
      queries.push(sql);
      return [sql.includes('FROM years') ? [{ id: 1, year: 2026 }] : []];
    }
  });
  const snapshot = await store.getSnapshot({ lines: true, years: ['id', 'year'] });
  assert.equal(queries[0], 'SELECT `lines`.*, total AS amount FROM `lines` ORDER BY id');
  assert.deepEqual(snapshot.years, [{ id: 1, year: 2026 }]);
});

test('invoice and client projections preserve aliases without loading full rows', async () => {
  const queries = [];
  const store = new MySqlStore({
    async query(sql, values) {
      queries.push({ sql, values });
      return [[{ id: 1 }]];
    },
    async execute(sql, values) {
      queries.push({ sql, values });
      return [[{ id: 1, email: 'billing@example.test' }]];
    }
  });
  await store.getInvoice(1, ['id', 'cost', 'status']);
  await store.getClient(1, ['name', 'email']);
  await store.getPasswordResetUser('billing@example.test');
  assert.deepEqual(queries, [
    { sql: "SELECT `invoices`.`id`, `invoices`.`cost`, CASE WHEN paid THEN 'paid' ELSE status END AS status FROM invoices WHERE id = ?", values: [1] },
    { sql: 'SELECT `c`.`name`, c.email_accounting AS email FROM clients c WHERE c.id = ?', values: [1] },
    { sql: 'SELECT id, email FROM users WHERE email = ? LIMIT 1', values: ['billing@example.test'] }
  ]);
});