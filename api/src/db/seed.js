import { closePool, getPool } from './pool.js';
import { initializeSchema } from './schema.js';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { companyInfo } from '@seferbiz/company';

function dateMonthsAgo(months, now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  date.setUTCDate(Math.min(now.getUTCDate(), new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days, now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function dateDaysAhead(days, now = new Date()) {
  return dateDaysAgo(-days, now);
}

function dateMonthsFromNow(months, now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
  return date.toISOString().slice(0, 10);
}

async function insertRows(database, table, columns, rows) {
  const names = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = VALUES(${column})`)
    .join(', ');
  const query = `INSERT INTO \`${table}\` (${names}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;

  for (const row of rows) {
    await database.execute(query, columns.map((column) => row[column] ?? null));
  }
}

export async function seedUser(database, password = process.env.SEED_USER_PASSWORD ?? (process.env.NODE_ENV === 'production' ? null : 'example123')) {
  if (typeof password !== 'string' || password.length === 0) return false;
  const encryptedPassword = await bcrypt.hash(password, 10);
  await database.execute(
    `INSERT INTO users (email, encrypted_password, first_name, last_name, otp_required_for_login)
     VALUES (?, ?, ?, ?, FALSE) ON DUPLICATE KEY UPDATE id = id`,
    [companyInfo.personMain.email, encryptedPassword, companyInfo.personMain.first_name, companyInfo.personMain.last_name]
  );
  return true;
}

async function insertRecurringExpenseSamples(connection, now) {
  const seedName = 'recurring-expenses-v2';
  const [marker] = await connection.execute('INSERT IGNORE INTO seed_runs (seed_name) VALUES (?)', [seedName]);
  if (!marker.affectedRows) return 0;
  async function ensureVendor(name, category) {
    const [existing] = await connection.execute('SELECT id FROM vendors WHERE name = ? ORDER BY id LIMIT 1', [name]);
    if (existing[0]) return Number(existing[0].id);
    const [created] = await connection.execute(
      'INSERT INTO vendors (name, category) VALUES (?, ?)', [name, category]
    );
    return Number(created.insertId);
  }
  const awsVendorId = await ensureVendor('Amazon Web Services', 'Web Service');
  const internetVendorId = await ensureVendor('Comcast Business', 'Business Service');
  const membershipVendorId = await ensureVendor('Professional Association', 'Education');
  const firstDayNextMonth = dateMonthsFromNow(1, now);
  const samples = [
    {
      name: 'AWS Monthly Usage', vendor_id: awsVendorId, cost: 125,
      start_date: firstDayNextMonth, interval_unit: 'month', interval_count: 1,
      account: 'Business', notes: 'Seed sample recurring expense.'
    },
    {
      name: 'Office Internet', vendor_id: internetVendorId, cost: 89.99,
      start_date: dateDaysAhead(7, now), interval_unit: 'month', interval_count: 1,
      account: 'Business', notes: 'Seed sample recurring expense.'
    },
    {
      name: 'Professional Membership', vendor_id: membershipVendorId, cost: 240,
      start_date: dateMonthsFromNow(3, now), interval_unit: 'year', interval_count: 1,
      account: 'Business', notes: 'Seed sample recurring expense.'
    }
  ];
  for (const sample of samples) {
    const [existingRules] = await connection.execute(
      'SELECT id FROM recurring_expense_rules WHERE name = ? AND notes = ? ORDER BY id LIMIT 1',
      [sample.name, sample.notes]
    );
    if (existingRules[0]) {
      const ruleId = Number(existingRules[0].id);
      await connection.execute('UPDATE recurring_expense_rules SET vendor_id = ? WHERE id = ?', [sample.vendor_id, ruleId]);
      await connection.execute(
        'UPDATE expenses SET vendor_id = ? WHERE recurring_rule_id = ? AND is_planned = TRUE', [sample.vendor_id, ruleId]
      );
      continue;
    }
    const [result] = await connection.execute(
      `INSERT INTO recurring_expense_rules
        (name, vendor_id, date, cost, notes, account, interval_unit, interval_count,
         start_date, end_date, next_date, next_index, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, TRUE)`,
      [sample.name, sample.vendor_id, sample.start_date, sample.cost, sample.notes, sample.account,
        sample.interval_unit, sample.interval_count, sample.start_date, sample.start_date]
    );
    await connection.execute(
      `INSERT INTO expenses (name, vendor_id, date, cost, notes, account, is_planned, recurring_rule_id)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [sample.name, sample.vendor_id, sample.start_date, sample.cost, sample.notes, sample.account, result.insertId]
    );
  }
  return samples.length;
}

export async function seedRecurringExpenses(database = getPool(), now = new Date()) {
  await initializeSchema(database);
  const connection = await database.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const inserted = await insertRecurringExpenseSamples(connection, now);
    await connection.commit();
    transactionStarted = false;
    return inserted;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function seedDatabase(database = getPool(), now = new Date()) {
  await initializeSchema(database);
  await seedUser(database);

  const connection = await database.getConnection();
  await connection.beginTransaction();
  try {
    const seedName = 'legacy-sample-v1';
    const [seedRuns] = await connection.query('SELECT seed_name FROM seed_runs WHERE seed_name = ? FOR UPDATE', [seedName]);
    if (!seedRuns.length) {
      const tables = ['clients', 'years', 'vendors', 'invoices', 'lines', 'expenses'];
      for (const table of tables) {
        const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
        if (Number(rows[0].count) > 0) {
          throw new Error(`Refusing to seed non-empty table ${table}; seed only a fresh database`);
        }
      }
    }

  await insertRows(connection, 'years', ['id', 'year', 'taxrate', 'goal_year', 'goals_months'],
    [-1, 0, 1].map((offset) => ({
      id: offset + 2,
      year: now.getUTCFullYear() + offset,
      taxrate: 0.4,
      goal_year: 0,
      goals_months: JSON.stringify(Array(12).fill(0))
    })));

  await insertRows(connection, 'clients', [
    'id', 'name', 'contact', 'site_url', 'address1', 'address2', 'zipcode', 'city', 'state',
    'email_accounting', 'preferred_paymenttype', 'currentrate', 'federalein'
  ], [{
    id: 1,
    name: companyInfo.legalEntity,
    contact: `${companyInfo.personMain.first_name} ${companyInfo.personMain.last_name}`,
    site_url: companyInfo.website,
    address1: companyInfo.address.address1,
    address2: companyInfo.address.address2,
    zipcode: companyInfo.address.zipcode,
    city: companyInfo.address.city,
    state: companyInfo.address.state,
    email_accounting: companyInfo.emailContact,
    preferred_paymenttype: 'Zelle',
    currentrate: 85,
    federalein: '81-0123456'
  }]);

  await insertRows(connection, 'vendors', ['id', 'name', 'category', 'notes'], [
    { id: 1, name: 'Amazon Web Services', category: 'Web Service', notes: null }
  ]);

  const invoices = [];
  const lines = [];
  const expenses = [];
  for (let index = 0; index <= 12; index += 1) {
    const monthsAgo = 13 - index;
    const invoiceId = index + 1;
    const invoiceCost = (index % 2 + index % 3 + index % 4 + 1) * 10000;
    invoices.push({
      id: invoiceId,
      client_id: 1,
      date: dateMonthsAgo(monthsAgo, now),
      cost: invoiceCost,
      paid: true,
      paiddate: dateMonthsAgo(monthsAgo - 1, now),
      paymenttype: 'Zelle',
      description: 'This invoice represents various work.'
    });
    lines.push({
      id: invoiceId,
      description: '50% Deposit',
      hourly: null,
      hours: null,
      rate: null,
      total: (index + 1) * 10000,
      invoice_id: invoiceId,
      discount: false
    });
    expenses.push({
      id: invoiceId,
      name: 'AWS Monthly Usage',
      vendor_id: 1,
      date: dateMonthsAgo(monthsAgo - 1, now),
      cost: (index + 1) * 1234.56,
      notes: 'Expense note example.',
      account: 'Business'
    });
  }

  invoices.push({
    id: 14,
    client_id: 1,
    date: dateDaysAgo(1, now),
    cost: 10000,
    paid: false,
    paiddate: null,
    paymenttype: null,
    description: 'This invoice represents various work.'
  });
  lines.push({
    id: 14,
    description: 'Hourly Work',
    hourly: true,
    hours: 10,
    rate: 100,
    total: 10000,
    invoice_id: 14,
    discount: false
  });

  await insertRows(connection, 'invoices', [
    'id', 'client_id', 'date', 'cost', 'paid', 'paiddate', 'paymenttype', 'description'
  ], invoices);
  await insertRows(connection, 'lines', [
    'id', 'description', 'hourly', 'hours', 'rate', 'total', 'invoice_id', 'discount'
  ], lines);
  await insertRows(connection, 'expenses', [
    'id', 'name', 'vendor_id', 'date', 'cost', 'notes', 'account'
  ], expenses);
  await insertRecurringExpenseSamples(connection, now);
    await connection.execute('INSERT IGNORE INTO seed_runs (seed_name) VALUES (?)', [seedName]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
      throw new Error('Refusing to seed production. Set ALLOW_PRODUCTION_SEED=true to override.');
    }
    if (process.argv.includes('--user-only')) {
      const database = getPool();
      await initializeSchema(database);
      if (!await seedUser(database)) throw new Error('SEED_USER_PASSWORD must be configured to seed a production user.');
      console.log('Seed user is ready.');
    } else if (process.argv.includes('--recurring-only')) {
      const inserted = await seedRecurringExpenses();
      console.log(inserted ? `Processed ${inserted} recurring expense samples.` : 'Recurring expense samples already exist.');
    } else {
      await seedDatabase();
      console.log('MySQL seed data is ready.');
    }
  } finally {
    await closePool();
  }
}
