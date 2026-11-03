import { createHash, randomBytes } from 'node:crypto';
import { getPool } from './pool.js';
import { recurringDate } from '../recurring/schedule.js';

const createAccessToken = () => randomBytes(24).toString('base64url');

const clientFields = [
  'name', 'contact', 'site_url', 'address1', 'address2', 'zipcode', 'city', 'state',
  'international', 'intinfo', 'email_accounting', 'email_accounting_2', 'email_accounting_3',
  'preferred_paymenttype', 'currentrate', 'federalein', 'payment_terms'
];
const vendorFields = ['name', 'category', 'notes'];
const yearFields = ['year', 'taxrate', 'goal_year', 'goals_months'];
const expenseFields = ['name', 'vendor_id', 'date', 'cost', 'notes', 'account', 'is_planned', 'recurring_rule_id'];
const recurringExpenseFields = [
  'name', 'vendor_id', 'date', 'cost', 'notes', 'account', 'interval_unit', 'interval_count',
  'start_date', 'end_date', 'next_date', 'next_index', 'active'
];

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

async function insertPlannedExpense(connection, rule, date) {
  const [result] = await connection.execute(
    `INSERT INTO expenses (name, vendor_id, date, cost, notes, account, is_planned, recurring_rule_id)
     VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
    [rule.name, rule.vendor_id ?? null, date, rule.cost, rule.notes ?? null, rule.account || 'Business', rule.id]
  );
  return Number(result.insertId);
}

function normalizeYear(year) {
  return {
    ...year,
    goals_months: typeof year.goals_months === 'string' ? JSON.parse(year.goals_months) : year.goals_months
  };
}

function presentFields(input, allowedFields) {
  return allowedFields.filter((field) => Object.hasOwn(input, field));
}

async function insertRecord(database, table, fields, input) {
  const columns = presentFields(input, fields);
  const values = columns.map((field) => field === 'goals_months' ? JSON.stringify(input[field]) : input[field]);
  const [result] = await database.execute(
    `INSERT INTO \`${table}\` (${columns.map((field) => `\`${field}\``).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
  return result.insertId;
}

async function updateRecord(database, table, fields, id, input) {
  const columns = presentFields(input, fields);
  if (!columns.length) return;
  const values = columns.map((field) => field === 'goals_months' ? JSON.stringify(input[field]) : input[field]);
  await database.execute(
    `UPDATE \`${table}\` SET ${columns.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
    [...values, id]
  );
}

export class MySqlStore {
  constructor(database = getPool()) {
    this.database = database;
  }

  async getUserByEmail(email) {
    const [rows] = await this.database.execute(
      `SELECT id, email, COALESCE(first_name, '') AS first_name, COALESCE(last_name, '') AS last_name, encrypted_password, encrypted_otp_secret,
        encrypted_otp_secret_iv, encrypted_otp_secret_salt, consumed_timestep,
        otp_required_for_login
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0];
  }

  async getUserPassword(id) {
    const [rows] = await this.database.execute(
      'SELECT id, encrypted_password FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0];
  }

  async getUserProfile(id) {
    const [rows] = await this.database.execute(
      `SELECT id, email, COALESCE(first_name, '') AS first_name, COALESCE(last_name, '') AS last_name
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0];
  }

  async createUserSession(userId, tokenHash, ttlSeconds, userAgent = '') {
    await this.database.execute(
      `DELETE FROM user_sessions
       WHERE expires_at <= UTC_TIMESTAMP()
         OR revoked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)`
    );
    const [result] = await this.database.execute(
      `INSERT INTO user_sessions (user_id, token_hash, user_agent, expires_at)
       VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))`,
      [userId, tokenHash, String(userAgent).slice(0, 512), ttlSeconds]
    );
    return Number(result.insertId);
  }

  async getUserSessionByTokenHash(tokenHash) {
    if (!tokenHash) return null;
    const [rows] = await this.database.execute(
      `SELECT s.id AS session_id, u.id, u.email,
        COALESCE(u.first_name, '') AS first_name, COALESCE(u.last_name, '') AS last_name
       FROM user_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()
       LIMIT 1`,
      [tokenHash]
    );
    const session = rows[0];
    if (!session) return null;
    await this.database.execute(
      `UPDATE user_sessions SET last_used_at = UTC_TIMESTAMP()
       WHERE id = ? AND (last_used_at IS NULL OR last_used_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE))`,
      [session.session_id]
    );
    return { ...session, session_id: Number(session.session_id) };
  }

  async getUserSessions(userId) {
    const [rows] = await this.database.execute(
      `SELECT id, user_agent, created_at, last_used_at, expires_at
       FROM user_sessions
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()
       ORDER BY last_used_at DESC, created_at DESC`,
      [userId]
    );
    return rows;
  }

  async revokeUserSession(userId, sessionId) {
    const [result] = await this.database.execute(
      `UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP()
       WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
      [sessionId, userId]
    );
    return result.affectedRows > 0;
  }

  async revokeUserSessions(userId, exceptSessionId = null) {
    const exceptClause = exceptSessionId == null ? '' : ' AND id <> ?';
    const values = exceptSessionId == null ? [userId] : [userId, exceptSessionId];
    const [result] = await this.database.execute(
      `UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND revoked_at IS NULL${exceptClause}`,
      values
    );
    return result.affectedRows;
  }

  async updateUserProfile(id, { first_name, last_name }) {
    await this.database.execute(
      'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
      [first_name, last_name, id]
    );
    return this.getUserProfile(id);
  }

  async updateUserPassword(id, encryptedPassword, currentSessionId = null) {
    await this.database.execute(
      'UPDATE users SET encrypted_password = ?, reset_password_token = NULL, reset_password_sent_at = NULL WHERE id = ?',
      [encryptedPassword, id]
    );
    await this.revokeUserSessions(id, currentSessionId);
  }

  async createPasswordReset(id, tokenDigest) {
    await this.database.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      [tokenDigest, id]
    );
  }

  async consumePasswordReset(tokenDigest, encryptedPassword) {
    const [users] = await this.database.execute(
      `SELECT id FROM users WHERE reset_password_token = ?
       AND reset_password_sent_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 6 HOUR) LIMIT 1`,
      [tokenDigest]
    );
    if (!users[0]) return false;
    const [result] = await this.database.execute(
      `UPDATE users SET encrypted_password = ?, reset_password_token = NULL,
        reset_password_sent_at = NULL WHERE reset_password_token = ?
        AND reset_password_sent_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 6 HOUR)`,
      [encryptedPassword, tokenDigest]
    );
    if (!result.affectedRows) return false;
    await this.revokeUserSessions(users[0].id);
    return true;
  }

  async recordUserSignIn(id, ipAddress) {
    await this.database.execute(
      `UPDATE users SET sign_in_count = sign_in_count + 1,
        last_sign_in_at = current_sign_in_at, current_sign_in_at = CURRENT_TIMESTAMP,
        last_sign_in_ip = current_sign_in_ip, current_sign_in_ip = ? WHERE id = ?`,
      [ipAddress || null, id]
    );
  }

  async consumeUserOtp(id, timestep) {
    const [result] = await this.database.execute(
      'UPDATE users SET consumed_timestep = ? WHERE id = ? AND (consumed_timestep IS NULL OR consumed_timestep <> ?)',
      [timestep, id, timestep]
    );
    return result.affectedRows > 0;
  }

  async getUserOtpSettings(id) {
    const [rows] = await this.database.execute(
      `SELECT id, otp_required_for_login, encrypted_otp_secret,
        encrypted_otp_secret_iv, encrypted_otp_secret_salt, consumed_timestep
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0];
  }

  async saveUserOtpSecret(id, secret) {
    const [result] = await this.database.execute(
      `UPDATE users SET encrypted_otp_secret = ?, encrypted_otp_secret_iv = ?,
        encrypted_otp_secret_salt = ?, consumed_timestep = NULL
       WHERE id = ? AND (otp_required_for_login IS NULL OR otp_required_for_login = FALSE)`,
      [secret.encrypted_otp_secret, secret.encrypted_otp_secret_iv, secret.encrypted_otp_secret_salt, id]
    );
    return result.affectedRows > 0;
  }

  async enableUserOtp(id) {
    const [result] = await this.database.execute(
      `UPDATE users SET otp_required_for_login = TRUE
       WHERE id = ? AND encrypted_otp_secret IS NOT NULL`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async disableUserOtp(id) {
    await this.database.execute(
      `UPDATE users SET otp_required_for_login = FALSE, encrypted_otp_secret = NULL,
        encrypted_otp_secret_iv = NULL, encrypted_otp_secret_salt = NULL,
        consumed_timestep = NULL WHERE id = ?`,
      [id]
    );
  }

  async getPasskeysByUser(userId) {
    const [rows] = await this.database.execute(
      `SELECT id, name, created_at FROM passkeys WHERE user_id = ? ORDER BY id`,
      [userId]
    );
    return rows;
  }

  async getPasskeyCredentialsByUser(userId) {
    const [rows] = await this.database.execute(
      'SELECT credential_id, transports FROM passkeys WHERE user_id = ? ORDER BY id',
      [userId]
    );
    return rows.map((row) => ({
      ...row,
      transports: typeof row.transports === 'string' ? JSON.parse(row.transports) : row.transports
    }));
  }

  async getPasskeyByCredentialId(credentialId) {
    const credentialHash = createHash('sha256').update(credentialId).digest();
    const [rows] = await this.database.execute(
      `SELECT user_id, credential_id, public_key, counter, transports
       FROM passkeys WHERE credential_id_hash = ? LIMIT 1`,
      [credentialHash]
    );
    const credential = rows[0];
    if (!credential) return undefined;
    return {
      ...credential,
      public_key: Buffer.from(credential.public_key),
      counter: Number(credential.counter),
      transports: typeof credential.transports === 'string' ? JSON.parse(credential.transports) : credential.transports
    };
  }

  async createPasskeyChallenge({ challenge_id, challenge, purpose, user_id = null }) {
    await this.database.execute('DELETE FROM webauthn_challenges WHERE expires_at <= CURRENT_TIMESTAMP');
    await this.database.execute(
      `INSERT INTO webauthn_challenges (challenge_id, challenge, purpose, user_id, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE))`,
      [challenge_id, challenge, purpose, user_id]
    );
  }

  async consumePasskeyChallenge(challengeId, purpose, userId = null) {
    const [rows] = await this.database.execute(
      `SELECT challenge_id, challenge, purpose, user_id FROM webauthn_challenges
       WHERE challenge_id = ? AND purpose = ? AND user_id <=> ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
      [challengeId, purpose, userId]
    );
    if (!rows[0]) return undefined;
    const [result] = await this.database.execute(
      'DELETE FROM webauthn_challenges WHERE challenge_id = ? AND purpose = ? AND user_id <=> ? AND expires_at > CURRENT_TIMESTAMP',
      [challengeId, purpose, userId]
    );
    return result.affectedRows === 1 ? rows[0] : undefined;
  }

  async createPasskey(userId, { credential_id, public_key, counter, transports, name }) {
    const credentialHash = createHash('sha256').update(credential_id).digest();
    const [result] = await this.database.execute(
      `INSERT INTO passkeys (user_id, credential_id, credential_id_hash, public_key, counter, transports, name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, credential_id, credentialHash, public_key, counter, JSON.stringify(transports || []), name]
    );
    const [rows] = await this.database.execute(
      'SELECT id, name, created_at FROM passkeys WHERE id = ? AND user_id = ? LIMIT 1',
      [result.insertId, userId]
    );
    return rows[0];
  }

  async updatePasskeyCounter(credentialId, counter) {
    const credentialHash = createHash('sha256').update(credentialId).digest();
    await this.database.execute(
      'UPDATE passkeys SET counter = ? WHERE credential_id_hash = ?',
      [counter, credentialHash]
    );
  }

  async deletePasskey(userId, id) {
    const [result] = await this.database.execute(
      'DELETE FROM passkeys WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  async getApiKeysByUser(userId) {
    const [rows] = await this.database.execute(
      `SELECT id, user_id, label, key_value AS \`key\`, last_used_at, created_at, updated_at
       FROM api_keys
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );
    return rows;
  }

  async createApiKey(userId, { label, key }) {
    const [result] = await this.database.execute(
      'INSERT INTO api_keys (user_id, label, key_value) VALUES (?, ?, ?)',
      [userId, label, key]
    );
    const [rows] = await this.database.execute(
      `SELECT id, user_id, label, key_value AS \`key\`, last_used_at, created_at, updated_at
       FROM api_keys
       WHERE id = ? AND user_id = ? LIMIT 1`,
      [result.insertId, userId]
    );
    return rows[0];
  }

  async updateApiKey(userId, id, input) {
    const fields = [];
    const values = [];
    if (input.label !== undefined) {
      fields.push('label = ?');
      values.push(input.label);
    }
    if (input.key !== undefined) {
      fields.push('key_value = ?');
      values.push(input.key);
    }
    if (!fields.length) return null;
    await this.database.execute(
      `UPDATE api_keys SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, id, userId]
    );
    const [rows] = await this.database.execute(
      `SELECT id, user_id, label, key_value AS \`key\`, last_used_at, created_at, updated_at
       FROM api_keys
       WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId]
    );
    return rows[0];
  }

  async deleteApiKey(userId, id) {
    const [result] = await this.database.execute(
      'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  async touchApiKeyLastUsed(key) {
    const [result] = await this.database.execute(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_value = ?',
      [key]
    );
    return result.affectedRows > 0;
  }

  async getSnapshot() {
    const [clients, invoices, lines, expenses, vendors, years] = await Promise.all([
      this.database.query(`SELECT c.*, c.email_accounting AS email
        FROM clients c
        LEFT JOIN (
          SELECT client_id, MAX(created_at) AS last_invoice_created_at
          FROM invoices
          WHERE client_id IS NOT NULL
          GROUP BY client_id
        ) invoice_activity ON invoice_activity.client_id = c.id
        ORDER BY GREATEST(
          COALESCE(c.created_at, '1970-01-01 00:00:00'),
          COALESCE(invoice_activity.last_invoice_created_at, '1970-01-01 00:00:00')
        ) DESC,
        c.id DESC`),
      this.database.query(`SELECT *, cost AS total, CASE WHEN paid THEN 'paid' ELSE status END AS status,
        (SELECT p.status FROM invoice_payments p WHERE p.invoice_id = invoices.id ORDER BY p.submitted_at DESC, p.id DESC LIMIT 1) AS payment_status
        FROM invoices ORDER BY id`),
      this.database.query('SELECT *, total AS amount FROM `lines` ORDER BY id'),
      this.database.query('SELECT * FROM expenses ORDER BY date, name'),
      this.database.query('SELECT * FROM vendors ORDER BY name'),
      this.database.query('SELECT * FROM years ORDER BY year DESC')
    ]);
    return {
      clients: clients[0],
      invoices: invoices[0],
      lines: lines[0],
      expenses: expenses[0],
      vendors: vendors[0],
      years: years[0].map(normalizeYear)
    };
  }

  async listClients({ pageSize, offset }) {
    const [[countRows], [rows]] = await Promise.all([
      this.database.query('SELECT COUNT(*) AS total FROM clients'),
      this.database.execute(`SELECT c.*, c.email_accounting AS email
        FROM clients c
        LEFT JOIN (
          SELECT client_id, MAX(created_at) AS last_invoice_created_at
          FROM invoices
          WHERE client_id IS NOT NULL
          GROUP BY client_id
        ) invoice_activity ON invoice_activity.client_id = c.id
        ORDER BY GREATEST(
          COALESCE(c.created_at, '1970-01-01 00:00:00'),
          COALESCE(invoice_activity.last_invoice_created_at, '1970-01-01 00:00:00')
        ) DESC, c.id DESC LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    return { items: rows, total: Number(countRows[0].total) };
  }

  async listInvoices({ pageSize, offset }) {
    const [[countRows], [rows]] = await Promise.all([
      this.database.query('SELECT COUNT(*) AS total FROM invoices'),
      this.database.execute(`SELECT invoices.*, invoices.cost AS total,
        CASE WHEN invoices.paid THEN 'paid' ELSE invoices.status END AS status,
        (SELECT p.status FROM invoice_payments p WHERE p.invoice_id = invoices.id ORDER BY p.submitted_at DESC, p.id DESC LIMIT 1) AS payment_status,
        clients.name AS client_name
        FROM invoices LEFT JOIN clients ON clients.id = invoices.client_id
        ORDER BY CASE WHEN invoices.paid OR invoices.status = 'paid' THEN 2 WHEN invoices.status = 'sent' THEN 1 ELSE 0 END,
          invoices.date DESC, invoices.id DESC LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    return { items: rows, total: Number(countRows[0].total) };
  }

  async listExpenses({ pageSize, offset, filter }) {
    const today = new Date().toISOString().slice(0, 10);
    let where = '';
    let values = [];
    if (filter === 'future') {
      where = 'WHERE expenses.date > ?';
      values = [today];
    } else if (filter === 'inactive') {
      where = 'WHERE expenses.date <= ? AND expenses.is_planned = FALSE';
      values = [today];
    } else if (filter !== 'all') {
      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      where = 'WHERE expenses.date >= ? AND expenses.date <= ? AND expenses.is_planned = FALSE';
      values = [cutoff.toISOString().slice(0, 10), today];
    }
    const order = filter === 'future' ? 'ASC' : 'DESC';
    const [[countRows], [rows]] = await Promise.all([
      this.database.execute(`SELECT COUNT(*) AS total FROM expenses ${where}`, values),
      this.database.execute(`SELECT expenses.*, vendors.name AS vendor_name
        FROM expenses LEFT JOIN vendors ON vendors.id = expenses.vendor_id
        ${where} ORDER BY expenses.date ${order}, expenses.id ${order} LIMIT ? OFFSET ?`, [...values, pageSize, offset])
    ]);
    return { items: rows, total: Number(countRows[0].total) };
  }

  async listVendors({ pageSize, offset }) {
    const [[countRows], [rows]] = await Promise.all([
      this.database.query('SELECT COUNT(*) AS total FROM vendors'),
      this.database.execute(`SELECT vendors.*, COUNT(expenses.id) AS expense_count,
        COALESCE(SUM(expenses.cost), 0) AS expense_total
        FROM vendors LEFT JOIN expenses ON expenses.vendor_id = vendors.id
          AND expenses.date <= UTC_DATE() AND expenses.is_planned = FALSE
        GROUP BY vendors.id
        ORDER BY LOWER(REGEXP_REPLACE(vendors.name, '^(the|a|an)[[:space:]]+', '')), vendors.id
        LIMIT ? OFFSET ?`, [pageSize, offset])
    ]);
    return { items: rows, total: Number(countRows[0].total) };
  }

  async getDashboardSummary() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const trailingStart = new Date(Date.UTC(year, month - 5, 1));
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const dataStart = trailingStart < yearStart ? trailingStart : yearStart;
    const rangeStart = dataStart.toISOString().slice(0, 10);
    const rangeEnd = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const firstTrailingYear = trailingStart.getUTCFullYear();
    const [[openRows], [revenueRows], [expenseRows], [yearRows], [recentInvoices]] = await Promise.all([
      this.database.query(`SELECT COUNT(*) AS count, COALESCE(SUM(cost), 0) AS total
        FROM invoices WHERE paid = FALSE AND status <> 'paid'`),
      this.database.execute(`SELECT DATE_FORMAT(COALESCE(paiddate, date), '%Y-%m') AS month,
          COALESCE(SUM(cost), 0) AS total
        FROM invoices
        WHERE (paid = TRUE OR status = 'paid') AND COALESCE(paiddate, date) >= ? AND COALESCE(paiddate, date) < ?
        GROUP BY DATE_FORMAT(COALESCE(paiddate, date), '%Y-%m')`, [rangeStart, rangeEnd]),
      this.database.execute(`SELECT DATE_FORMAT(date, '%Y-%m') AS month, COALESCE(SUM(cost), 0) AS total
        FROM expenses WHERE is_planned = FALSE AND date >= ? AND date < ?
        GROUP BY DATE_FORMAT(date, '%Y-%m')`, [rangeStart, rangeEnd]),
      this.database.execute('SELECT * FROM years WHERE year BETWEEN ? AND ? ORDER BY year', [firstTrailingYear, year]),
      this.database.execute(`SELECT invoices.*, invoices.cost AS total,
          CASE WHEN invoices.paid THEN 'paid' ELSE invoices.status END AS status,
          (SELECT p.status FROM invoice_payments p WHERE p.invoice_id = invoices.id ORDER BY p.submitted_at DESC, p.id DESC LIMIT 1) AS payment_status,
          clients.name AS client_name
        FROM invoices LEFT JOIN clients ON clients.id = invoices.client_id
        ORDER BY invoices.date DESC,
          CASE WHEN invoices.paid OR invoices.status = 'paid' THEN 2 WHEN invoices.status = 'sent' THEN 1 ELSE 0 END,
          invoices.id DESC LIMIT 6`)
    ]);
    const monthlyRevenue = Object.fromEntries(revenueRows.map((row) => [row.month, Number(row.total)]));
    const monthlyExpenses = Object.fromEntries(expenseRows.map((row) => [row.month, Number(row.total)]));
    const sumCurrentYear = (monthly) => Object.entries(monthly)
      .filter(([key]) => key.startsWith(`${year}-`))
      .reduce((total, [, value]) => total + value, 0);
    return {
      year,
      month: monthKey,
      openInvoices: { count: Number(openRows[0].count), total: Number(openRows[0].total) },
      monthlyRevenue,
      monthlyExpenses,
      yearRevenue: sumCurrentYear(monthlyRevenue),
      yearExpenses: sumCurrentYear(monthlyExpenses),
      yearRecords: yearRows.map(normalizeYear),
      recentInvoices
    };
  }

  async searchRecords(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const patterns = terms.map((term) => `%${term.replace(/[\\%_]/g, '\\$&')}%`);
    const condition = (columns) => terms.map(() =>
      `LOWER(CONCAT_WS(' ', ${columns.map((column) => `COALESCE(${column}, '')`).join(', ')})) COLLATE utf8mb4_unicode_ci LIKE ?`
    ).join(' AND ');
    const search = async (sql, primaryColumns, searchableColumns) => {
      const primaryCondition = condition(primaryColumns);
      const searchableCondition = condition(searchableColumns);
      const [rows] = await this.database.execute(
        `${sql.replace('/* rank */', `CASE WHEN ${primaryCondition} THEN 2 ELSE 1 END AS search_rank,`)}
         WHERE ${searchableCondition}
         ORDER BY search_rank DESC, title LIMIT 12`,
        [...patterns, ...patterns]
      );
      return rows;
    };
    const [clients, vendors, expenses, invoices, lines, years] = await Promise.all([
      search(`SELECT c.id, c.name, c.name AS title, c.contact, c.city, c.state, c.email_accounting,
          CONCAT_WS(' ', c.contact, c.city, c.state) AS detail, /* rank */
          CONCAT('/clients/', c.id) AS href FROM clients c`,
      ['c.name'], ['c.name', 'c.contact', 'c.email_accounting', 'c.city']),
      search(`SELECT v.id, v.name, v.name AS title, v.category, v.notes, v.category AS detail, /* rank */
          CONCAT('/vendors/', v.id) AS href FROM vendors v`,
      ['v.name'], ['v.name', 'v.category', 'v.notes']),
      search(`SELECT e.id, e.name, e.name AS title, e.account, e.notes, e.date, v.name AS vendor_name,
          CONCAT_WS(' · ', v.name, e.date, e.account) AS detail, /* rank */
          CONCAT('/expenses/', e.id) AS href FROM expenses e LEFT JOIN vendors v ON v.id = e.vendor_id`,
      ['e.name'], ['e.name', 'v.name', 'e.account', 'e.notes', 'e.date']),
      search(`SELECT i.id, i.description, i.client_id, i.status, i.date, i.paymenttype, c.name AS client_name,
          CAST(i.id AS CHAR) AS invoice_id_text, i.description AS title,
          CONCAT_WS(' · ', CAST(i.id AS CHAR), c.name, i.status, i.date) AS detail,
          CONCAT('/invoices/', i.id) AS href, /* rank */
          CASE WHEN i.paid THEN 'paid' ELSE i.status END AS normalized_status
        FROM invoices i LEFT JOIN clients c ON c.id = i.client_id`,
      ['i.description', 'CAST(i.id + 100000 AS CHAR)',
        `CONCAT(LOWER(LEFT(REGEXP_REPLACE(COALESCE(c.name, ''), '[^0-9A-Za-z]', ''), 21)), '-', LPAD(i.id + 100000, 6, '0'))`],
      ['i.description', 'CAST(i.id AS CHAR)', 'CAST(i.id + 100000 AS CHAR)', 'c.name', 'i.status', 'i.date', 'i.paymenttype',
        `CONCAT(LOWER(LEFT(REGEXP_REPLACE(COALESCE(c.name, ''), '[^0-9A-Za-z]', ''), 21)), '-', LPAD(i.id + 100000, 6, '0'))`]),
      search(`SELECT l.id, l.description AS title, l.invoice_id, c.name AS client_name,
          CONCAT('Invoice ', l.invoice_id) AS detail, CONCAT('/invoices/', l.invoice_id) AS href, /* rank */
          l.description AS searchable_description
        FROM \`lines\` l JOIN invoices i ON i.id = l.invoice_id LEFT JOIN clients c ON c.id = i.client_id`,
      ['l.description'], ['l.description']),
        search(`SELECT y.year AS id, y.year, CAST(y.year AS CHAR) AS title, 'Financial year' AS detail,
          CONCAT('/years/', y.year) AS href, /* rank */ CAST(y.year AS CHAR) AS year_text FROM years y`,
      ['CAST(y.year AS CHAR)'], ['CAST(y.year AS CHAR)'])
    ]);
    return { clients, vendors, expenses, invoices, lines, years };
  }

  async recordHistory(entry) {
    const [result] = await this.database.execute(
      `INSERT INTO change_history (entity_type, entity_id, action, actor_user_id, actor_email, source, changes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.entity_type, entry.entity_id, entry.action, entry.actor_user_id, entry.actor_email,
        entry.source, JSON.stringify(entry.changes)]
    );
    return result.insertId;
  }

  async listHistory({ entityType, entityId, pageSize, offset }) {
    const filters = [];
    const values = [];
    if (entityType) {
      filters.push('entity_type = ?');
      values.push(entityType);
    }
    if (entityId) {
      filters.push('entity_id = ?');
      values.push(entityId);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [[countRows], [items]] = await Promise.all([
      this.database.execute(`SELECT COUNT(*) AS total FROM change_history ${where}`, values),
      this.database.execute(`SELECT id, entity_type, entity_id, action, actor_user_id, actor_email,
          source, changes, created_at
        FROM change_history ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, pageSize, offset])
    ]);
    return { items, total: Number(countRows[0].total) };
  }

  async getExpensesByIds(ids) {
    if (!ids.length) return [];
    const [rows] = await this.database.execute(
      `SELECT * FROM expenses WHERE id IN (${ids.map(() => '?').join(', ')})`, ids
    );
    return rows;
  }

  async getClient(id) {
    const [rows] = await this.database.query('SELECT *, email_accounting AS email FROM clients WHERE id = ?', [id]);
    return rows[0];
  }

  async listInvoiceTemplates(clientId) {
    const [rows] = clientId == null
      ? await this.database.query('SELECT * FROM invoice_templates ORDER BY client_id IS NOT NULL, name, id')
      : await this.database.execute(
        'SELECT * FROM invoice_templates WHERE client_id IS NULL OR client_id = ? ORDER BY client_id IS NOT NULL, name, id',
        [clientId]
      );
    return rows;
  }

  async getInvoiceTemplate(id) {
    const [rows] = await this.database.execute('SELECT * FROM invoice_templates WHERE id = ? LIMIT 1', [id]);
    return rows[0];
  }

  async createInvoiceTemplate(input) {
    const [result] = await this.database.execute(
      'INSERT INTO invoice_templates (client_id, name, description) VALUES (?, ?, ?)',
      [input.client_id ?? null, input.name, input.description]
    );
    return this.getInvoiceTemplate(result.insertId);
  }

  async updateInvoiceTemplate(id, input) {
    const fields = presentFields(input, ['client_id', 'name', 'description']);
    if (fields.length) {
      await this.database.execute(
        `UPDATE invoice_templates SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
        [...fields.map((field) => input[field]), id]
      );
    }
    return this.getInvoiceTemplate(id);
  }

  async deleteInvoiceTemplate(id) {
    const [result] = await this.database.execute('DELETE FROM invoice_templates WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async createClient(input) {
    const id = await insertRecord(this.database, 'clients', clientFields, { payment_terms: 'Net 15', ...input });
    return this.getClient(id);
  }

  async updateClient(id, input) {
    await updateRecord(this.database, 'clients', clientFields, id, input);
    return this.getClient(id);
  }

  async deleteClient(id) {
    const [result] = await this.database.execute('DELETE FROM clients WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async ensureClientAccessToken(id) {
    await this.database.execute(
      "UPDATE clients SET access_token = ? WHERE id = ? AND (access_token IS NULL OR access_token = '')",
      [createAccessToken(), id]
    );
    return (await this.getClient(id))?.access_token;
  }

  async setClientStripeCustomerId(id, customerId) {
    await this.database.execute('UPDATE clients SET stripe_customer_id = ? WHERE id = ?', [customerId, id]);
  }

  async getVendor(id) {
    const [rows] = await this.database.query('SELECT * FROM vendors WHERE id = ?', [id]);
    return rows[0];
  }

  async hasVendorUsage(id) {
    const [rows] = await this.database.execute(
      `SELECT EXISTS(SELECT 1 FROM expenses WHERE vendor_id = ?) OR
        EXISTS(SELECT 1 FROM recurring_expense_rules WHERE vendor_id = ?) AS in_use`, [id, id]
    );
    return Boolean(rows[0].in_use);
  }

  async createVendor(input) {
    const id = await insertRecord(this.database, 'vendors', vendorFields, input);
    return this.getVendor(id);
  }

  async updateVendor(id, input) {
    await updateRecord(this.database, 'vendors', vendorFields, id, input);
    return this.getVendor(id);
  }

  async deleteVendor(id) {
    const [result] = await this.database.execute('DELETE FROM vendors WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async getYear(id) {
    const [rows] = await this.database.query('SELECT * FROM years WHERE id = ?', [id]);
    return rows[0] ? normalizeYear(rows[0]) : undefined;
  }

  async createYear(input) {
    const id = await insertRecord(this.database, 'years', yearFields, input);
    return this.getYear(id);
  }

  async updateYear(id, input) {
    await updateRecord(this.database, 'years', yearFields, id, input);
    return this.getYear(id);
  }

  async deleteYear(id) {
    const [result] = await this.database.execute('DELETE FROM years WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async getExpense(id) {
    const [rows] = await this.database.query('SELECT * FROM expenses WHERE id = ?', [id]);
    return rows[0];
  }

  async listRecurringExpenseRules() {
    const [rows] = await this.database.execute(
      'SELECT * FROM recurring_expense_rules ORDER BY active DESC, next_date, id'
    );
    return rows;
  }

  async getRecurringExpenseRule(id) {
    const [rows] = await this.database.execute('SELECT * FROM recurring_expense_rules WHERE id = ?', [id]);
    return rows[0];
  }

  async deleteRecurringExpenseRule(id) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [rules] = await connection.execute(
        'SELECT * FROM recurring_expense_rules WHERE id = ? FOR UPDATE', [id]
      );
      const rule = rules[0];
      if (!rule) {
        await connection.rollback();
        transactionStarted = false;
        return null;
      }
      const [actualExpenses] = await connection.execute(
        'SELECT id FROM expenses WHERE recurring_rule_id = ? AND is_planned = FALSE FOR UPDATE', [id]
      );
      const [plannedExpenses] = await connection.execute(
        'SELECT * FROM expenses WHERE recurring_rule_id = ? AND is_planned = TRUE FOR UPDATE', [id]
      );
      await connection.execute(
        'DELETE FROM expenses WHERE recurring_rule_id = ? AND is_planned = TRUE', [id]
      );
      await connection.execute('DELETE FROM recurring_expense_rules WHERE id = ?', [id]);
      await connection.commit();
      transactionStarted = false;
      return { rule, plannedExpenses, preservedExpenseIds: actualExpenses.map((expense) => Number(expense.id)) };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createRecurringExpenseRule(input) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    let ruleId;
    let expenseId;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const rule = {
        ...input,
        date: input.start_date,
        next_date: input.start_date,
        next_index: 0,
        active: true
      };
      ruleId = await insertRecord(connection, 'recurring_expense_rules', recurringExpenseFields, rule);
      await insertPlannedExpense(connection, { ...rule, id: ruleId }, rule.next_date);
      const [rows] = await connection.execute(
        'SELECT id FROM expenses WHERE recurring_rule_id = ? AND date = ? AND is_planned = TRUE',
        [ruleId, rule.next_date]
      );
      expenseId = Number(rows[0]?.id);
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return { rule: await this.getRecurringExpenseRule(ruleId), expense: await this.getExpense(expenseId) };
  }

  async updateRecurringExpenseRule(id, updates) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [rows] = await connection.execute(
        'SELECT * FROM recurring_expense_rules WHERE id = ? FOR UPDATE', [id]
      );
      const current = rows[0];
      if (!current) {
        await connection.rollback();
        transactionStarted = false;
        return null;
      }
      const changes = Object.fromEntries(recurringExpenseFields
        .filter((field) => updates[field] !== undefined)
        .map((field) => [field, updates[field]]));
      const next = { ...current, ...changes };
      const scheduleChanged = updates.start_date !== undefined || updates.interval_unit !== undefined || updates.interval_count !== undefined;
      if (scheduleChanged && updates.start_date === undefined) {
        next.start_date = dateOnly(current.next_date || current.start_date);
      }
      if (scheduleChanged) {
        next.date = next.start_date;
        next.next_date = next.start_date;
        next.next_index = 0;
      }
      if (!Boolean(Number(current.active)) && updates.active === true && current.next_date) {
        let resumeIndex = Number(current.next_index);
        let resumeDate = dateOnly(current.next_date);
        const today = new Date().toISOString().slice(0, 10);
        while (resumeDate <= today && resumeIndex < 10000) {
          resumeIndex += 1;
          resumeDate = recurringDate(dateOnly(next.start_date), next.interval_unit, Number(next.interval_count), resumeIndex);
        }
        next.next_index = resumeIndex;
        next.next_date = resumeDate;
      }
      if (next.end_date && next.next_date && dateOnly(next.next_date) > dateOnly(next.end_date)) {
        next.active = false;
        next.next_date = null;
      }
      await updateRecord(connection, 'recurring_expense_rules', recurringExpenseFields, id, next);
      const [plannedRows] = await connection.execute(
        'SELECT id FROM expenses WHERE recurring_rule_id = ? AND is_planned = TRUE ORDER BY date, id FOR UPDATE', [id]
      );
      if (!next.active || !next.next_date) {
        if (plannedRows.length) {
          await connection.execute(
            'DELETE FROM expenses WHERE recurring_rule_id = ? AND is_planned = TRUE', [id]
          );
        }
      } else if (plannedRows[0]) {
        await updateRecord(connection, 'expenses', expenseFields, plannedRows[0].id, {
          name: next.name,
          vendor_id: next.vendor_id,
          date: next.next_date,
          cost: next.cost,
          notes: next.notes,
          account: next.account,
          is_planned: true,
          recurring_rule_id: Number(id)
        });
        if (plannedRows.length > 1) {
          await connection.execute(
            'DELETE FROM expenses WHERE recurring_rule_id = ? AND is_planned = TRUE AND id <> ?', [id, plannedRows[0].id]
          );
        }
      } else {
        await insertPlannedExpense(connection, { ...next, id: Number(id) }, dateOnly(next.next_date));
      }
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getRecurringExpenseRule(id);
  }

  async processDueRecurringExpenses(today = new Date().toISOString().slice(0, 10)) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    let activated = 0;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [rules] = await connection.execute(
        `SELECT * FROM recurring_expense_rules
         WHERE active = TRUE AND next_date IS NOT NULL AND next_date <= ?
         ORDER BY next_date, id FOR UPDATE`, [today]
      );
      for (const rule of rules) {
        let occurrenceIndex = Number(rule.next_index);
        let occurrenceDate = dateOnly(rule.next_date);
        let catchUpCount = 0;
        while (occurrenceDate <= today && catchUpCount < 1000) {
          occurrenceIndex += 1;
          const nextDate = recurringDate(
            dateOnly(rule.start_date), rule.interval_unit, Number(rule.interval_count), occurrenceIndex
          );
          if (rule.end_date && nextDate > dateOnly(rule.end_date)) {
            await connection.execute(
              'UPDATE recurring_expense_rules SET active = FALSE, next_date = NULL, next_index = ? WHERE id = ?',
              [occurrenceIndex, rule.id]
            );
            break;
          }
          await connection.execute(
            'UPDATE recurring_expense_rules SET next_date = ?, next_index = ? WHERE id = ?',
            [nextDate, occurrenceIndex, rule.id]
          );
          const [existingOccurrence] = await connection.execute(
            'SELECT id FROM expenses WHERE recurring_rule_id = ? AND date = ? LIMIT 1 FOR UPDATE',
            [rule.id, nextDate]
          );
          if (!existingOccurrence.length) await insertPlannedExpense(connection, rule, nextDate);
          occurrenceDate = nextDate;
          catchUpCount += 1;
        }
      }
      const [dueExpenses] = await connection.execute(
        'SELECT id FROM expenses WHERE is_planned = TRUE AND date <= ? ORDER BY date, id FOR UPDATE', [today]
      );
      for (const expense of dueExpenses) {
        await connection.execute('UPDATE expenses SET is_planned = FALSE WHERE id = ? AND is_planned = TRUE', [expense.id]);
        await connection.execute(
          `INSERT INTO change_history (entity_type, entity_id, action, actor_user_id, actor_email, source, changes)
           VALUES ('expense', ?, 'activated', NULL, NULL, 'scheduler', ?)`,
          [expense.id, JSON.stringify({ is_planned: { from: true, to: false } })]
        );
        activated += 1;
      }
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return activated;
  }

  async createExpense(input) {
    const id = await insertRecord(this.database, 'expenses', expenseFields, input);
    return this.getExpense(id);
  }

  async createExpenses(inputs) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    const ids = [];
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      for (const input of inputs) {
        ids.push(await insertRecord(connection, 'expenses', expenseFields, input));
      }
      await connection.commit();
      transactionStarted = false;
      return Promise.all(ids.map((id) => this.getExpense(id)));
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateExpense(id, input) {
    await updateRecord(this.database, 'expenses', expenseFields, id, input);
    return this.getExpense(id);
  }

  async updateExpenses(records) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    const ids = [];
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      for (const record of records) {
        const [existing] = await connection.execute('SELECT id FROM expenses WHERE id = ? FOR UPDATE', [record.id]);
        if (!existing.length) {
          await connection.rollback();
          transactionStarted = false;
          return null;
        }
        await updateRecord(connection, 'expenses', expenseFields, record.id, record);
        ids.push(record.id);
      }
      await connection.commit();
      transactionStarted = false;
      return Promise.all(ids.map((id) => this.getExpense(id)));
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteExpense(id) {
    const [result] = await this.database.execute('DELETE FROM expenses WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async createInvoice(input) {
    const paid = input.paid ?? input.status === 'paid';
    const [result] = await this.database.execute(
      `INSERT INTO invoices
        (client_id, date, cost, paid, paiddate, paymenttype, description, status, currency, stripe_session_id, access_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.client_id ?? null,
        input.date ?? null,
        input.cost ?? input.total ?? null,
        paid,
        input.paiddate ?? null,
        input.paymenttype ?? null,
        input.description ?? null,
        input.status ?? (paid ? 'paid' : 'draft'),
        input.currency ?? 'USD',
        input.stripe_session_id ?? null,
        createAccessToken()
      ]
    );
    return this.getInvoice(result.insertId);
  }

  async getInvoice(id) {
    const [rows] = await this.database.query(
      `SELECT *, cost AS total, CASE WHEN paid THEN 'paid' ELSE status END AS status,
        (SELECT p.status FROM invoice_payments p WHERE p.invoice_id = invoices.id ORDER BY p.submitted_at DESC, p.id DESC LIMIT 1) AS payment_status
       FROM invoices WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  async getInvoiceLines(invoiceId) {
    const [rows] = await this.database.execute(
      'SELECT *, total AS amount FROM `lines` WHERE invoice_id = ? ORDER BY id', [invoiceId]
    );
    return rows;
  }

  async getInvoicePayments(invoiceId) {
    const [rows] = await this.database.query(
      'SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY submitted_at DESC, id DESC',
      [invoiceId]
    );
    return rows;
  }

  async recordInvoicePayment(payment) {
    const [existing] = await this.database.query(
      'SELECT status FROM invoice_payments WHERE stripe_checkout_session_id = ?',
      [payment.stripe_checkout_session_id]
    );
    const previousStatus = existing[0]?.status;
    // Succeeded and failed are final, so late or out-of-order events cannot revert them.
    await this.database.execute(
      `INSERT INTO invoice_payments
        (invoice_id, stripe_checkout_session_id, stripe_payment_intent_id, method, amount, currency, status, failure_message, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'processing', NULL, CURRENT_TIMESTAMP)) AS incoming
       ON DUPLICATE KEY UPDATE
        stripe_payment_intent_id = COALESCE(incoming.stripe_payment_intent_id, invoice_payments.stripe_payment_intent_id),
        failure_message = IF(invoice_payments.status IN ('succeeded', 'failed'), invoice_payments.failure_message, incoming.failure_message),
        completed_at = IF(invoice_payments.status IN ('succeeded', 'failed'), invoice_payments.completed_at, incoming.completed_at),
        status = IF(invoice_payments.status IN ('succeeded', 'failed'), invoice_payments.status, incoming.status)`,
      [payment.invoice_id, payment.stripe_checkout_session_id, payment.stripe_payment_intent_id ?? null, payment.method ?? null,
        payment.amount ?? null, payment.currency ?? 'USD', payment.status, payment.failure_message ?? null, payment.status]
    );
    return previousStatus === undefined
      || (!['succeeded', 'failed'].includes(previousStatus) && previousStatus !== payment.status);
  }

  async getInvoiceEmailSends(invoiceId) {
    const [rows] = await this.database.query(
      'SELECT id, invoice_id, recipient, sent_at FROM invoice_email_sends WHERE invoice_id = ? ORDER BY sent_at DESC, id DESC',
      [invoiceId]
    );
    return rows;
  }

  async recordInvoiceEmailSend(invoiceId, recipient) {
    const [result] = await this.database.execute(
      'INSERT INTO invoice_email_sends (invoice_id, recipient) VALUES (?, ?)',
      [invoiceId, recipient]
    );
    const [rows] = await this.database.query(
      'SELECT id, invoice_id, recipient, sent_at FROM invoice_email_sends WHERE id = ?',
      [result.insertId]
    );
    return rows[0];
  }

  async createInvoiceLine(invoiceId, input) {
    const [result] = await this.database.execute(
      `INSERT INTO \`lines\` (description, hourly, hours, rate, total, invoice_id, discount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.description ?? null,
        input.hourly ?? null,
        input.hours ?? null,
        input.rate ?? null,
        input.total ?? input.amount ?? null,
        invoiceId,
        input.discount ?? false
      ]
    );
    const [rows] = await this.database.query(
      'SELECT *, total AS amount FROM `lines` WHERE id = ?',
      [result.insertId]
    );
    return rows[0];
  }

  async replaceInvoiceLines(invoiceId, inputs) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    const lines = [];
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [invoiceRows] = await connection.execute('SELECT id FROM invoices WHERE id = ? FOR UPDATE', [invoiceId]);
      if (!invoiceRows.length) {
        await connection.rollback();
        transactionStarted = false;
        return null;
      }
      await connection.execute('DELETE FROM `lines` WHERE invoice_id = ?', [invoiceId]);
      for (const input of inputs) {
        const [result] = await connection.execute(
          `INSERT INTO \`lines\` (description, hourly, hours, rate, total, invoice_id, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [input.description ?? null, input.hourly ?? null, input.hours ?? null, input.rate ?? null,
            input.total ?? input.amount ?? null, invoiceId, input.discount ?? false]
        );
        const [rows] = await connection.query('SELECT *, total AS amount FROM `lines` WHERE id = ?', [result.insertId]);
        lines.push(rows[0]);
      }
      await connection.commit();
      transactionStarted = false;
      return lines;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateInvoice(id, updates) {
    const allowed = [
      'client_id', 'date', 'cost', 'paid', 'paiddate', 'paymenttype', 'description',
      'status', 'currency', 'stripe_session_id'
    ];
    const fields = allowed.filter((field) => updates[field] !== undefined);
    if (fields.length) {
      await this.database.execute(
        `UPDATE invoices SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
        [...fields.map((field) => updates[field]), id]
      );
    }
    return this.getInvoice(id);
  }

  async deleteInvoice(id) {
    const [result] = await this.database.execute('DELETE FROM invoices WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async ensureInvoiceAccessToken(id) {
    await this.database.execute(
      "UPDATE invoices SET access_token = ? WHERE id = ? AND (access_token IS NULL OR access_token = '')",
      [createAccessToken(), id]
    );
    return (await this.getInvoice(id))?.access_token;
  }

  async setInvoiceStripeSession(id, sessionId) {
    await this.database.execute('UPDATE invoices SET stripe_session_id = ? WHERE id = ?', [sessionId, id]);
  }

  async markInvoicePaid(id, { paiddate, paymenttype }) {
    const connection = await this.database.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [rows] = await connection.execute(
        'SELECT id, paid, status, paiddate, paymenttype FROM invoices WHERE id = ? FOR UPDATE', [id]
      );
      const before = rows[0];
      if (!before || before.paid) {
        await connection.rollback();
        transactionStarted = false;
        return false;
      }
      const [result] = await connection.execute(
        "UPDATE invoices SET paid = TRUE, status = 'paid', paiddate = ?, paymenttype = ? WHERE id = ? AND paid = FALSE",
        [paiddate, paymenttype, id]
      );
      if (!result.affectedRows) {
        await connection.rollback();
        transactionStarted = false;
        return false;
      }
      const changes = {
        paid: { from: Boolean(before.paid), to: true },
        status: { from: before.paid ? 'paid' : before.status, to: 'paid' },
        paiddate: { from: before.paiddate, to: paiddate },
        paymenttype: { from: before.paymenttype, to: paymenttype }
      };
      await connection.execute(
        `INSERT INTO change_history (entity_type, entity_id, action, actor_user_id, actor_email, source, changes)
         VALUES ('invoice', ?, 'payment_received', NULL, NULL, 'stripe', ?)`,
        [id, JSON.stringify(changes)]
      );
      await connection.commit();
      transactionStarted = false;
      return true;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
