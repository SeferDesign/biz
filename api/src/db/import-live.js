import { closePool, getPool } from './pool.js';
import { initializeSchema } from './schema.js';
import pg from 'pg';

const { Client } = pg;

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 't' || normalized === 'true' || normalized === '1';
  }
  return false;
}

function parsePgArrayOfNumbers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => Number(entry) || 0);
  if (typeof value !== 'string') return [];
  if (!value.startsWith('{') || !value.endsWith('}')) return [];
  const body = value.slice(1, -1).trim();
  if (!body) return [];
  return body.split(',').map((entry) => Number(entry.trim()) || 0);
}

function normalizeGoalsMonths(value) {
  const parsed = parsePgArrayOfNumbers(value);
  if (!parsed.length) return JSON.stringify(Array(12).fill(0));
  if (parsed.length >= 12) return JSON.stringify(parsed.slice(0, 12));
  return JSON.stringify(parsed.concat(Array(12 - parsed.length).fill(0)));
}

function normalizePaymentTerms(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Net 15';
  return value;
}

function normalizeStatus(isPaid) {
  return isPaid ? 'paid' : 'sent';
}

function truncateString(value, maxLength) {
  if (typeof value !== 'string') return value;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

async function truncateTarget(connection) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    const tables = [
      'invoice_email_sends',
      'invoice_payments',
      'lines',
      'invoices',
      'expenses',
      'vendors',
      'years',
      'clients',
      'users'
    ];
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function insertClients(mysqlConnection, pgClient) {
  const { rows } = await pgClient.query(`
    SELECT id, name, contact, site_url, logo, address1, address2, zipcode, city, state,
      international, intinfo, email_accounting, email_accounting_2, email_accounting_3,
      preferred_paymenttype, currentrate, federalein, gsheet_id, stripe_customer_id,
      access_token, created_at, updated_at
    FROM public.clients
    ORDER BY id
  `);

  const sql = `
    INSERT INTO clients (
      id, name, contact, site_url, logo, address1, address2, zipcode, city, state,
      international, intinfo, email_accounting, email_accounting_2, email_accounting_3,
      preferred_paymenttype, currentrate, federalein, payment_terms, gsheet_id,
      stripe_customer_id, access_token, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    await mysqlConnection.execute(sql, [
      row.id,
      row.name,
      row.contact,
      row.site_url,
      row.logo,
      row.address1,
      row.address2,
      row.zipcode == null ? null : String(row.zipcode),
      row.city,
      row.state,
      parseBoolean(row.international),
      row.intinfo,
      row.email_accounting,
      row.email_accounting_2,
      row.email_accounting_3,
      row.preferred_paymenttype,
      row.currentrate,
      row.federalein,
      normalizePaymentTerms(null),
      row.gsheet_id,
      row.stripe_customer_id,
      row.access_token,
      row.created_at,
      row.updated_at
    ]);
  }

  return rows.length;
}

async function insertYears(mysqlConnection, pgClient) {
  const { rows } = await pgClient.query(`
    SELECT id, year, taxrate, goal_year, goals_months, created_at, updated_at
    FROM public.years
    ORDER BY id
  `);

  const sql = `
    INSERT INTO years (
      id, year, taxrate, goal_year, goals_months, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    await mysqlConnection.execute(sql, [
      row.id,
      row.year,
      row.taxrate ?? 0,
      row.goal_year ?? 0,
      normalizeGoalsMonths(row.goals_months),
      row.created_at,
      row.updated_at
    ]);
  }

  return rows.length;
}

async function insertVendors(mysqlConnection, pgClient) {
  const { rows } = await pgClient.query(`
    SELECT id, name, category, notes, created_at, updated_at
    FROM public.vendors
    ORDER BY id
  `);

  const sql = `
    INSERT INTO vendors (
      id, name, category, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    await mysqlConnection.execute(sql, [
      row.id,
      row.name,
      row.category,
      row.notes,
      row.created_at,
      row.updated_at
    ]);
  }

  return rows.length;
}

async function insertInvoices(mysqlConnection, pgClient) {
  const { rows } = await pgClient.query(`
    SELECT id, client_id, date, cost, paid, paiddate, paymenttype, description,
      stripe_session_id, access_token, created_at, updated_at
    FROM public.invoices
    ORDER BY id
  `);

  const sql = `
    INSERT INTO invoices (
      id, client_id, date, cost, paid, paiddate, paymenttype, description,
      status, currency, stripe_session_id, access_token, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    const paid = parseBoolean(row.paid);
    await mysqlConnection.execute(sql, [
      row.id,
      row.client_id,
      row.date,
      row.cost ?? 0,
      paid,
      row.paiddate,
      row.paymenttype,
      row.description,
      normalizeStatus(paid),
      'USD',
      row.stripe_session_id,
      row.access_token,
      row.created_at,
      row.updated_at
    ]);
  }

  return rows.length;
}

async function insertLines(mysqlConnection, pgClient) {
  const { rows } = await pgClient.query(`
    SELECT id, description, hourly, hours, rate, total, invoice_id, discount, created_at, updated_at
    FROM public.lines
    ORDER BY id
  `);

  const sql = `
    INSERT INTO \`lines\` (
      id, description, hourly, hours, rate, total, invoice_id, discount, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    await mysqlConnection.execute(sql, [
      row.id,
      row.description,
      row.hourly == null ? null : parseBoolean(row.hourly),
      row.hours,
      row.rate,
      row.total,
      row.invoice_id,
      parseBoolean(row.discount),
      row.created_at,
      row.updated_at
    ]);
  }

  return rows.length;
}

async function insertExpenses(mysqlConnection, pgClient) {
  const { rows } = await pgClient.query(`
    SELECT id, name, vendor_id, date, cost, notes, account, created_at, updated_at
    FROM public.expenses
    ORDER BY id
  `);

  const sql = `
    INSERT INTO expenses (
      id, name, vendor_id, date, cost, notes, account, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    await mysqlConnection.execute(sql, [
      row.id,
      row.name,
      row.vendor_id,
      row.date,
      row.cost,
      row.notes,
      row.account,
      row.created_at,
      row.updated_at
    ]);
  }

  return rows.length;
}

async function insertUsers(mysqlConnection, pgClient) {
  const preserveImportedOtp = process.env.PRESERVE_IMPORTED_OTP === 'true';
  const { rows } = await pgClient.query(`
    SELECT id, email, encrypted_password, reset_password_token, reset_password_sent_at,
      remember_created_at, sign_in_count, current_sign_in_at, last_sign_in_at,
      current_sign_in_ip, last_sign_in_ip, created_at, updated_at,
      encrypted_otp_secret, encrypted_otp_secret_iv, encrypted_otp_secret_salt,
      consumed_timestep, otp_required_for_login, google_token
    FROM public.users
    ORDER BY id
  `);

  const sql = `
    INSERT INTO users (
      id, email, encrypted_password, first_name, last_name,
      reset_password_token, reset_password_sent_at, remember_created_at,
      sign_in_count, current_sign_in_at, last_sign_in_at,
      current_sign_in_ip, last_sign_in_ip, created_at, updated_at,
      encrypted_otp_secret, encrypted_otp_secret_iv, encrypted_otp_secret_salt,
      consumed_timestep, otp_required_for_login, google_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of rows) {
    const encryptedOtpSecret = preserveImportedOtp ? row.encrypted_otp_secret : null;
    const encryptedOtpSecretIv = preserveImportedOtp ? row.encrypted_otp_secret_iv : null;
    const encryptedOtpSecretSalt = preserveImportedOtp ? row.encrypted_otp_secret_salt : null;
    const consumedTimestep = preserveImportedOtp ? row.consumed_timestep : null;
    const otpRequiredForLogin = preserveImportedOtp ? parseBoolean(row.otp_required_for_login) : false;

    await mysqlConnection.execute(sql, [
      row.id,
      row.email,
      row.encrypted_password,
      '',
      '',
      row.reset_password_token,
      row.reset_password_sent_at,
      row.remember_created_at,
      row.sign_in_count ?? 0,
      row.current_sign_in_at,
      row.last_sign_in_at,
      row.current_sign_in_ip,
      row.last_sign_in_ip,
      row.created_at,
      row.updated_at,
      encryptedOtpSecret,
      encryptedOtpSecretIv,
      encryptedOtpSecretSalt,
      consumedTimestep,
      otpRequiredForLogin,
      truncateString(row.google_token, 255)
    ]);
  }

  return rows.length;
}

async function main() {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) {
    throw new Error('LEGACY_DATABASE_URL is required, e.g. postgres://postgres:postgres@127.0.0.1:9543/legacy_import');
  }

  const pgClient = new Client({ connectionString: legacyUrl });
  const mysqlPool = getPool();

  await initializeSchema(mysqlPool);
  await pgClient.connect();

  const mysqlConnection = await mysqlPool.getConnection();
  try {
    await mysqlConnection.beginTransaction();
    await truncateTarget(mysqlConnection);

    const imported = {
      clients: await insertClients(mysqlConnection, pgClient),
      years: await insertYears(mysqlConnection, pgClient),
      vendors: await insertVendors(mysqlConnection, pgClient),
      invoices: await insertInvoices(mysqlConnection, pgClient),
      lines: await insertLines(mysqlConnection, pgClient),
      expenses: await insertExpenses(mysqlConnection, pgClient),
      users: await insertUsers(mysqlConnection, pgClient)
    };

    await mysqlConnection.commit();

    console.log('Live import reconciliation complete.');
    for (const [table, count] of Object.entries(imported)) {
      console.log(`- ${table}: ${count}`);
    }
  } catch (error) {
    await mysqlConnection.rollback();
    throw error;
  } finally {
    mysqlConnection.release();
    await pgClient.end();
    await closePool();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
