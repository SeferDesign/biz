import { Router } from 'express';
import { isDate, isFiniteNumber, parseId } from '../shared/validation.js';

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

export default function invoicesRouter(store) {
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

  async function queueInvoiceEmail(invoice, res) {
    const clients = (await store.getSnapshot()).clients;
    return res.json({
      invoice_id: invoice.id,
      status: 'queued',
      recipient: clients.find((client) => client.id === invoice.client_id)?.email || 'billing@example.com',
      message: 'Invoice email queued for delivery.'
    });
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

  router.get('/invoices/:invoice_id/lines/:id', async (req, res) => {
    const snapshot = await store.getSnapshot();
    const line = snapshot.lines.find((item) =>
      item.invoice_id === Number(req.params.invoice_id) && item.id === Number(req.params.id));
    if (!line) return res.status(404).json({ error: 'Invoice line not found' });
    return res.json(line);
  });

  router.get('/invoices/:id/email', async (req, res) => {
    const invoice = await store.getInvoice(Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return queueInvoiceEmail(invoice, res);
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
