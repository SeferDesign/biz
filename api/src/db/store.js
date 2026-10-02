import { randomBytes } from 'node:crypto';
import { getPool } from './pool.js';

const createAccessToken = () => randomBytes(24).toString('base64url');

const clientFields = [
  'name', 'contact', 'site_url', 'address1', 'address2', 'zipcode', 'city', 'state',
  'international', 'intinfo', 'email_accounting', 'email_accounting_2', 'email_accounting_3',
  'preferred_paymenttype', 'currentrate', 'federalein', 'payment_terms'
];
const vendorFields = ['name', 'category', 'notes'];
const yearFields = ['year', 'taxrate', 'goal_year', 'goals_months'];
const expenseFields = ['name', 'vendor_id', 'date', 'cost', 'notes', 'account'];

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

  async updateUserProfile(id, { first_name, last_name }) {
    await this.database.execute(
      'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
      [first_name, last_name, id]
    );
    return this.getUserProfile(id);
  }

  async updateUserPassword(id, encryptedPassword) {
    await this.database.execute(
      'UPDATE users SET encrypted_password = ?, reset_password_token = NULL, reset_password_sent_at = NULL WHERE id = ?',
      [encryptedPassword, id]
    );
  }

  async createPasswordReset(id, tokenDigest) {
    await this.database.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      [tokenDigest, id]
    );
  }

  async consumePasswordReset(tokenDigest, encryptedPassword) {
    const [result] = await this.database.execute(
      `UPDATE users SET encrypted_password = ?, reset_password_token = NULL,
        reset_password_sent_at = NULL WHERE reset_password_token = ?
        AND reset_password_sent_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 6 HOUR)`,
      [encryptedPassword, tokenDigest]
    );
    return result.affectedRows > 0;
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

  async getClient(id) {
    const [rows] = await this.database.query('SELECT *, email_accounting AS email FROM clients WHERE id = ?', [id]);
    return rows[0];
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

  async setClientStripeCustomerId(id, customerId) {
    await this.database.execute('UPDATE clients SET stripe_customer_id = ? WHERE id = ?', [customerId, id]);
  }

  async getVendor(id) {
    const [rows] = await this.database.query('SELECT * FROM vendors WHERE id = ?', [id]);
    return rows[0];
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
    const [result] = await this.database.execute(
      "UPDATE invoices SET paid = TRUE, status = 'paid', paiddate = ?, paymenttype = ? WHERE id = ? AND paid = FALSE",
      [paiddate, paymenttype, id]
    );
    return result.affectedRows > 0;
  }
}
