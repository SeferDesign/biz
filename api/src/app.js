import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const invoices = [
  { id: 1, client_id: 1, status: 'draft', total: 1200.0, currency: 'USD', date: '2025-01-10' },
  { id: 2, client_id: 2, status: 'sent', total: 980.5, currency: 'USD', date: '2025-02-05' },
  { id: 3, client_id: 1, status: 'paid', total: 2150.0, currency: 'USD', date: '2025-03-01', paiddate: '2025-03-15' }
];

const clients = [
  { id: 1, name: 'Acme Inc.', email: 'billing@acme.com' },
  { id: 2, name: 'Northwind', email: 'finance@northwind.example' }
];

const invoiceLines = {
  1: [
    { id: 1, invoice_id: 1, description: 'Design retainer', amount: 600 },
    { id: 2, invoice_id: 1, description: 'Development sprint', amount: 600 }
  ],
  2: [
    { id: 3, invoice_id: 2, description: 'Consulting hours', amount: 980.5 }
  ]
};

const vendors = [
  { id: 1, name: 'Adobe', category: 'Software', notes: '' },
  { id: 2, name: 'Office Depot', category: 'Supplies', notes: '' }
];

const expenses = [
  { id: 1, name: 'Creative Cloud', vendor_id: 1, date: '2025-01-15', cost: 59.99, account: 'Business', notes: '' },
  { id: 2, name: 'Printer paper', vendor_id: 2, date: '2025-02-10', cost: 42.5, account: 'Business', notes: '' }
];

const years = [
  { id: 1, year: 2025, taxrate: 0.25, goal_year: 24000, goals_months: Array(12).fill(2000) },
  { id: 2, year: 2024, taxrate: 0.25, goal_year: 24000, goals_months: Array(12).fill(2000) }
];

const expenseCategories = [
  'Software', 'Transporation', 'Web Service', 'Supplies', 'Business Service',
  'Travel', 'Contractor', 'Meals and Entertainment', 'Education', 'Charity', 'Other'
];

function findYear(id) {
  return years.find((item) => item.id === Number(id) || String(item.year) === String(id));
}

function invoiceDate(invoice) {
  return invoice.paiddate || invoice.date;
}

function isPaid(invoice) {
  return invoice.paid === true || invoice.status === 'paid';
}

function invoiceAmount(invoice) {
  return Number(invoice.cost ?? invoice.total ?? 0);
}

function sum(values) {
  const total = values.reduce((result, value) => result + Number(value || 0), 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

function monthlyAmount(records, year, month, dateOf, amountOf) {
  return sum(records
    .filter((record) => {
      const date = new Date(`${dateOf(record)}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
    })
    .map(amountOf));
}

function series(name, data) {
  return { name, data };
}

function yearIncome(year) {
  return invoices.filter((invoice) => {
    const date = invoiceDate(invoice);
    return isPaid(invoice) && date && new Date(`${date}T00:00:00Z`).getUTCFullYear() === year;
  });
}

function yearExpenses(year) {
  return expenses.filter((expense) => new Date(`${expense.date}T00:00:00Z`).getUTCFullYear() === year);
}

export function createApp() {
  const app = express();
  app.use(express.json());

  const openApiDocument = yaml.parse(
    fs.readFileSync(path.join(__dirname, 'openapi/openapi.yaml'), 'utf8')
  );

  app.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api' });
  });

  app.get('/v1/invoices', (req, res) => {
    res.json(invoices);
  });

  app.post('/v1/invoices', (req, res) => {
    const invoice = {
      id: invoices.length ? Math.max(...invoices.map((item) => item.id)) + 1 : 1,
      ...req.body,
      status: req.body.status || 'draft'
    };

    invoices.push(invoice);
    res.status(201).json(invoice);
  });

  app.get('/v1/invoices/:id', (req, res) => {
    const invoice = invoices.find((item) => item.id === Number(req.params.id));

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json(invoice);
  });

  app.get('/v1/invoices/:id/email', (req, res) => {
    const invoice = invoices.find((item) => item.id === Number(req.params.id));

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json({
      invoice_id: invoice.id,
      status: 'queued',
      recipient: clients.find((client) => client.id === invoice.client_id)?.email || 'billing@example.com',
      message: 'Invoice email queued for delivery.'
    });
  });

  app.get('/v1/invoices/:invoice_id/lines', (req, res) => {
    const invoiceId = Number(req.params.invoice_id);
    const lines = invoiceLines[invoiceId] || [];
    res.json(lines);
  });

  app.post('/v1/invoices/:invoice_id/lines', (req, res) => {
    const invoiceId = Number(req.params.invoice_id);
    const currentLines = invoiceLines[invoiceId] || [];
    const line = {
      id: currentLines.length ? Math.max(...currentLines.map((item) => item.id)) + 1 : 1,
      invoice_id: invoiceId,
      ...req.body
    };

    invoiceLines[invoiceId] = [...currentLines, line];
    res.status(201).json(line);
  });

  app.get('/v1/invoices/:invoice_id/lines/:id', (req, res) => {
    const invoiceId = Number(req.params.invoice_id);
    const lineId = Number(req.params.id);
    const line = (invoiceLines[invoiceId] || []).find((item) => item.id === lineId);

    if (!line) {
      return res.status(404).json({ error: 'Invoice line not found' });
    }

    return res.json(line);
  });

  app.get('/v1/clients', (req, res) => {
    res.json(clients);
  });

  app.get('/v1/clients/:id', (req, res) => {
    const client = clients.find((item) => item.id === Number(req.params.id));

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json(client);
  });

  app.get('/years', (req, res) => {
    res.json([...years].sort((left, right) => right.year - left.year));
  });

  app.get('/years/new', (req, res) => {
    res.json({ year: { year: new Date().getUTCFullYear(), taxrate: 0, goal_year: 0, goals_months: Array(12).fill(0) } });
  });

  app.get('/years/:id/income', (req, res) => {
    const year = findYear(req.params.id);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    const records = yearIncome(year.year);
    return res.json({ year: year.year, invoices: records, total: sum(records.map(invoiceAmount)) });
  });

  app.get('/years/:id/expenses', (req, res) => {
    const year = findYear(req.params.id);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    const records = yearExpenses(year.year);
    return res.json({ year: year.year, expenses: records, total: sum(records.map((expense) => expense.cost)) });
  });

  app.get('/years/:id/edit', (req, res) => {
    const year = findYear(req.params.id);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    return res.json({ year });
  });

  app.get('/years/:id', (req, res) => {
    const year = findYear(req.params.id);
    if (!year) return res.status(404).json({ error: 'Year not found' });
    const income = sum(yearIncome(year.year).map(invoiceAmount));
    const expenseTotal = sum(yearExpenses(year.year).map((expense) => expense.cost));
    return res.json({ ...year, income_total: income, expenses_total: expenseTotal, net_income: income - expenseTotal, tax_owed: income * year.taxrate });
  });

  app.get('/invoices/:id/email', (req, res) => {
    const invoice = invoices.find((item) => item.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json({
      invoice_id: invoice.id,
      status: 'queued',
      recipient: clients.find((client) => client.id === invoice.client_id)?.email || 'billing@example.com',
      message: 'Invoice email queued for delivery.'
    });
  });

  app.get('/invoices/:id/stripe', (req, res) => {
    const invoice = invoices.find((item) => item.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const sessionId = req.query.session_id;
    if (!sessionId || sessionId !== invoice.stripe_session_id) {
      return res.status(400).json({ error: 'Invalid Stripe session' });
    }
    invoice.status = 'paid';
    invoice.paid = true;
    invoice.paiddate = new Date().toISOString().slice(0, 10);
    invoice.paymenttype = 'Stripe';
    return res.json({ invoice_id: invoice.id, status: 'paid', paiddate: invoice.paiddate });
  });

  app.get('/expenses', (req, res) => {
    const now = new Date().toISOString().slice(0, 10);
    const filtered = expenses.filter((expense) => {
      if (req.query.future === 'true') return expense.date > now;
      if (req.query.inactive === 'true') return expense.date <= now;
      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      return expense.date >= cutoff.toISOString().slice(0, 10) && expense.date <= now;
    });
    return res.json(filtered.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)));
  });

  app.get('/vendors', (req, res) => {
    const sortableName = (name) => name.replace(/^(the|a|an)\s+/i, '');
    return res.json([...vendors].sort((left, right) => sortableName(left.name).localeCompare(sortableName(right.name))));
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
  });

  return app;
}

export default { createApp };
