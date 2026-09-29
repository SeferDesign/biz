import { getPool } from './pool.js';

const clientFields = [
  'name', 'contact', 'site_url', 'address1', 'address2', 'zipcode', 'city', 'state',
  'international', 'intinfo', 'email_accounting', 'email_accounting_2', 'email_accounting_3',
  'preferred_paymenttype', 'currentrate', 'federalein'
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

  async getSnapshot() {
    const [clients, invoices, lines, expenses, vendors, years] = await Promise.all([
      this.database.query('SELECT *, email_accounting AS email FROM clients ORDER BY id'),
      this.database.query("SELECT *, cost AS total, CASE WHEN paid THEN 'paid' ELSE status END AS status FROM invoices ORDER BY id"),
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
    const id = await insertRecord(this.database, 'clients', clientFields, input);
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

  async updateExpense(id, input) {
    await updateRecord(this.database, 'expenses', expenseFields, id, input);
    return this.getExpense(id);
  }

  async deleteExpense(id) {
    const [result] = await this.database.execute('DELETE FROM expenses WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async createInvoice(input) {
    const paid = input.paid ?? input.status === 'paid';
    const [result] = await this.database.execute(
      `INSERT INTO invoices
        (client_id, date, cost, paid, paiddate, paymenttype, description, status, currency, stripe_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        input.stripe_session_id ?? null
      ]
    );
    return this.getInvoice(result.insertId);
  }

  async getInvoice(id) {
    const [rows] = await this.database.query(
      "SELECT *, cost AS total, CASE WHEN paid THEN 'paid' ELSE status END AS status FROM invoices WHERE id = ?",
      [id]
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
}
