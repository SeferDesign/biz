import { getPool } from './pool.js';

function normalizeYear(year) {
  return {
    ...year,
    goals_months: typeof year.goals_months === 'string' ? JSON.parse(year.goals_months) : year.goals_months
  };
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
    const allowed = ['paid', 'paiddate', 'paymenttype', 'status'];
    const fields = allowed.filter((field) => updates[field] !== undefined);
    if (fields.length) {
      await this.database.execute(
        `UPDATE invoices SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
        [...fields.map((field) => updates[field]), id]
      );
    }
    return this.getInvoice(id);
  }
}
