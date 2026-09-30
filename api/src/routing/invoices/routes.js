import { Router } from 'express';
import { isDate, isFiniteNumber, parseId } from '../shared/validation.js';
import { sendInvoiceEmail as deliverInvoiceEmail } from '../../email/invoice-mailer.js';

const invoiceStatuses = new Set(['draft', 'sent', 'paid']);

function normalizeInvoiceInput(input = {}) {
  const normalized = { ...input };
  if (normalized.cost === undefined && normalized.total !== undefined) normalized.cost = normalized.total;
  delete normalized.total;
  return normalized;
}

function validateInvoiceInput(input, { partial = false } = {}) {
  if (!partial || input.client_id !== undefined) {
    if (!parseId(input.client_id)) return 'A valid client id is required';
  }
  if ((!partial || input.date !== undefined) && !isDate(input.date)) return 'Invoice date must use YYYY-MM-DD';
  if (input.paiddate !== undefined && input.paiddate !== null && input.paiddate !== '' && !isDate(input.paiddate)) {
    return 'Paid date must use YYYY-MM-DD';
  }
  if ((!partial || input.cost !== undefined) && !isFiniteNumber(input.cost)) return 'Invoice amount must be numeric';
  if (input.cost !== undefined && Number(input.cost) < 0) return 'Invoice amount cannot be negative';
  if (input.status !== undefined && !invoiceStatuses.has(input.status)) return 'Status must be draft, sent, or paid';
  if (input.paid !== undefined && typeof input.paid !== 'boolean' && ![0, 1].includes(input.paid)) {
    return 'Paid must be a boolean';
  }
  if (input.currency !== undefined && (typeof input.currency !== 'string' || input.currency.length !== 3)) {
    return 'Currency must be a three-letter code';
  }
  return null;
}

export default function invoicesRouter(store, { sendInvoiceEmail = deliverInvoiceEmail } = {}) {
  const router = Router();

  router.get('/invoices', async (req, res) => res.json((await store.getSnapshot()).invoices));

  router.post('/invoices', async (req, res) => {
    const input = normalizeInvoiceInput(req.body);
    const error = validateInvoiceInput(input);
    if (error) return res.status(400).json({ error });
    if (!await store.getClient(Number(input.client_id))) return res.status(400).json({ error: 'Client not found' });
    const invoiceInput = { ...input, client_id: Number(input.client_id), cost: Number(input.cost) };
    if (invoiceInput.status) invoiceInput.paid = invoiceInput.status === 'paid';
    return res.status(201).json(await store.createInvoice(invoiceInput));
  });

  router.get('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const invoice = await store.getInvoice(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(invoice);
  });

  router.patch('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const input = normalizeInvoiceInput(req.body);
    if (!Object.keys(input).length) return res.status(400).json({ error: 'At least one invoice field is required' });
    const error = validateInvoiceInput(input, { partial: true });
    if (error) return res.status(400).json({ error });
    if (input.client_id !== undefined && !await store.getClient(Number(input.client_id))) {
      return res.status(400).json({ error: 'Client not found' });
    }
    const updates = { ...input };
    if (updates.client_id !== undefined) updates.client_id = Number(updates.client_id);
    if (updates.cost !== undefined) updates.cost = Number(updates.cost);
    if (updates.status !== undefined) updates.paid = updates.status === 'paid';
    const invoice = await store.updateInvoice(id, updates);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(invoice);
  });

  router.put('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const input = normalizeInvoiceInput(req.body);
    const error = validateInvoiceInput(input);
    if (error) return res.status(400).json({ error });
    if (!await store.getClient(Number(input.client_id))) return res.status(400).json({ error: 'Client not found' });
    const updates = { ...input, client_id: Number(input.client_id), cost: Number(input.cost) };
    updates.paid = updates.status ? updates.status === 'paid' : Boolean(updates.paid);
    const invoice = await store.updateInvoice(id, updates);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(invoice);
  });

  router.delete('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    if (!await store.deleteInvoice(id)) return res.status(404).json({ error: 'Invoice not found' });
    return res.sendStatus(204);
  });

  async function sendInvoiceEmailRoute(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const invoice = await store.getInvoice(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const snapshot = await store.getSnapshot();
    const client = snapshot.clients.find((item) => item.id === invoice.client_id);
    if (!client) return res.status(400).json({ error: 'Invoice client not found' });
    const lines = snapshot.lines.filter((line) => line.invoice_id === invoice.id);
    try {
      const result = await sendInvoiceEmail({ invoice, client, lines });
      const recipient = result?.recipient || client.email || client.email_accounting;
      const emailSend = await store.recordInvoiceEmailSend(invoice.id, recipient);
      return res.json({
        invoice_id: invoice.id,
        status: 'sent',
        recipient,
        email_send: emailSend,
        message: 'Invoice email sent.'
      });
    } catch (error) {
      return res.status(502).json({ error: error.message || 'Invoice email could not be sent' });
    }
  }

  router.get('/invoices/:invoice_id/lines', async (req, res) => {
    const lines = (await store.getSnapshot()).lines
      .filter((line) => line.invoice_id === Number(req.params.invoice_id));
    res.json(lines);
  });

  router.post('/invoices/:invoice_id/lines', async (req, res) => {
    const line = await store.createInvoiceLine(Number(req.params.invoice_id), req.body);
    res.status(201).json(line);
  });

  router.put('/invoices/:invoice_id/lines', async (req, res) => {
    const invoiceId = parseId(req.params.invoice_id);
    if (!invoiceId) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Invoice lines must be an array' });
    const invalidLine = req.body.some((line) => !line || typeof line !== 'object' || Array.isArray(line) ||
      (line.description !== undefined && line.description !== null && typeof line.description !== 'string') ||
      ['hours', 'rate', 'total', 'amount'].some((field) => line[field] !== undefined && line[field] !== null &&
        line[field] !== '' && !isFiniteNumber(line[field])));
    if (invalidLine) return res.status(400).json({ error: 'Invoice lines contain invalid values' });
    const lines = req.body.map((line) => ({
      description: line.description?.trim() || null,
      hours: line.hours === '' ? null : line.hours,
      rate: line.rate === '' ? null : line.rate,
      total: line.total ?? line.amount ?? null,
      hourly: line.hourly ?? null,
      discount: Boolean(line.discount)
    }));
    const updatedLines = await store.replaceInvoiceLines(invoiceId, lines);
    if (!updatedLines) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(updatedLines);
  });

  router.get('/invoices/:invoice_id/lines/:id', async (req, res) => {
    const snapshot = await store.getSnapshot();
    const line = snapshot.lines.find((item) =>
      item.invoice_id === Number(req.params.invoice_id) && item.id === Number(req.params.id));
    if (!line) return res.status(404).json({ error: 'Invoice line not found' });
    return res.json(line);
  });

  router.get('/invoices/:id/email', sendInvoiceEmailRoute);
  router.post('/invoices/:id/email', sendInvoiceEmailRoute);

  router.get('/invoices/:id/email-sends', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    if (!await store.getInvoice(id)) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(await store.getInvoiceEmailSends(id));
  });

  router.get('/invoices/:id/stripe', async (req, res) => {
    const invoice = await store.getInvoice(Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const sessionId = req.query.session_id;
    if (!sessionId || sessionId !== invoice.stripe_session_id) {
      return res.status(400).json({ error: 'Invalid Stripe session' });
    }
    const paiddate = new Date().toISOString().slice(0, 10);
    await store.updateInvoice(invoice.id, { status: 'paid', paid: true, paiddate, paymenttype: 'Stripe' });
    return res.json({ invoice_id: invoice.id, status: 'paid', paiddate });
  });

  return router;
}
