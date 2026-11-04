import { Router } from 'express';
import { isDate, isFiniteNumber, parseId, parsePagination } from '../shared/validation.js';
import { invoiceClientFields, publicInvoice, publicLine } from '../shared/public-views.js';
import { sendInvoiceEmail as deliverInvoiceEmail } from '../../email/invoice-mailer.js';
import { createInvoicePdf } from '../../pdf/invoice-pdf.js';
import { displayIdNumber, withInvoiceDisplayIds } from '@seferbiz/company';
import { historyFields, writeHistory } from '../shared/history.js';

const invoiceStatuses = new Set(['draft', 'sent', 'paid']);
const deliveryInvoiceFields = ['id', 'client_id', 'date', 'cost', 'paid', 'status', 'currency', 'description', 'access_token'];
const deliveryClientFields = [
  'id', 'name', 'contact', 'email', 'email_accounting', 'email_accounting_2', 'email_accounting_3',
  'address1', 'address2', 'city', 'state', 'zipcode', 'payment_terms', 'access_token'
];

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

  router.get('/invoices', async (req, res) => {
    const pagination = parsePagination(req.query);
    if (pagination === false) return res.status(400).json({ error: 'Invalid pagination parameters' });
    if (pagination) {
      const result = await store.listInvoices(pagination);
      const items = result.items.map((invoice) => withInvoiceDisplayIds(invoice, invoice.client_name));
      return res.json({ items, total: result.total, page: pagination.page, pageSize: pagination.pageSize });
    }
    const snapshot = await store.getSnapshot({ clients: ['id', 'name'], invoices: true });
    const clientsById = new Map(snapshot.clients.map((client) => [Number(client.id), client]));
    return res.json(snapshot.invoices.map((invoice) => withInvoiceDisplayIds(invoice, clientsById.get(Number(invoice.client_id))?.name)));
  });

  router.post('/invoices', async (req, res) => {
    const input = normalizeInvoiceInput(req.body);
    const error = validateInvoiceInput(input);
    if (error) return res.status(400).json({ error });
    const client = await store.getClientName(Number(input.client_id));
    if (!client) return res.status(400).json({ error: 'Client not found' });
    const invoiceInput = { ...input, client_id: Number(input.client_id), cost: Number(input.cost) };
    if (invoiceInput.status) invoiceInput.paid = invoiceInput.status === 'paid';
    const invoice = await store.createInvoice(invoiceInput);
    await writeHistory(store, req, { entityType: 'invoice', entityId: invoice.id, action: 'created', after: invoice, fields: historyFields.invoice });
    return res.status(201).json(withInvoiceDisplayIds(invoice, client?.name));
  });

  router.get('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const invoice = await store.getInvoice(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const client = invoice.client_id
      ? await (req.recordAccess ? store.getClient(invoice.client_id, invoiceClientFields) : store.getClientName(invoice.client_id))
      : null;
    const invoiceWithDisplayIds = withInvoiceDisplayIds(invoice, client?.name);
    if (req.recordAccess) {
      return res.json(publicInvoice(invoiceWithDisplayIds, client));
    }
    return res.json(invoiceWithDisplayIds);
  });

  router.post('/invoices/:id/access-token', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const accessToken = await store.ensureInvoiceAccessToken(id);
    if (!accessToken) return res.status(404).json({ error: 'Invoice not found' });
    return res.json({ access_token: accessToken });
  });

  router.patch('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const input = normalizeInvoiceInput(req.body);
    if (!Object.keys(input).length) return res.status(400).json({ error: 'At least one invoice field is required' });
    const error = validateInvoiceInput(input, { partial: true });
    if (error) return res.status(400).json({ error });
    if (input.client_id !== undefined && !await store.hasClient(Number(input.client_id))) {
      return res.status(400).json({ error: 'Client not found' });
    }
    const updates = { ...input };
    if (updates.client_id !== undefined) updates.client_id = Number(updates.client_id);
    if (updates.cost !== undefined) updates.cost = Number(updates.cost);
    if (updates.status !== undefined) updates.paid = updates.status === 'paid';
    const current = await store.getInvoice(id);
    const before = current ? structuredClone(current) : null;
    const invoice = await store.updateInvoice(id, updates);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await writeHistory(store, req, { entityType: 'invoice', entityId: id, action: 'updated', before, after: invoice, fields: historyFields.invoice });
    const client = invoice.client_id ? await store.getClientName(invoice.client_id) : null;
    return res.json(withInvoiceDisplayIds(invoice, client?.name));
  });

  router.put('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const input = normalizeInvoiceInput(req.body);
    const error = validateInvoiceInput(input);
    if (error) return res.status(400).json({ error });
    if (!await store.hasClient(Number(input.client_id))) return res.status(400).json({ error: 'Client not found' });
    const updates = { ...input, client_id: Number(input.client_id), cost: Number(input.cost) };
    updates.paid = updates.status ? updates.status === 'paid' : Boolean(updates.paid);
    const current = await store.getInvoice(id);
    const before = current ? structuredClone(current) : null;
    const invoice = await store.updateInvoice(id, updates);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await writeHistory(store, req, { entityType: 'invoice', entityId: id, action: 'updated', before, after: invoice, fields: historyFields.invoice });
    const client = invoice.client_id ? await store.getClientName(invoice.client_id) : null;
    return res.json(withInvoiceDisplayIds(invoice, client?.name));
  });

  router.delete('/invoices/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const before = await store.getInvoice(id);
    if (!before || !await store.deleteInvoice(id)) return res.status(404).json({ error: 'Invoice not found' });
    await writeHistory(store, req, { entityType: 'invoice', entityId: id, action: 'deleted', before, fields: historyFields.invoice });
    return res.sendStatus(204);
  });

  router.get('/invoices/:id/pdf', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const invoice = await store.getInvoice(id, deliveryInvoiceFields);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const [clientRecord, lines] = await Promise.all([
      invoice.client_id ? store.getClient(invoice.client_id, deliveryClientFields) : null,
      store.getInvoiceLines(invoice.id)
    ]);
    const client = clientRecord || {};
    try {
      const pdf = await createInvoicePdf({ invoice, client, lines });
      const filename = `Invoice-${displayIdNumber(invoice.id)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdf);
    } catch {
      return res.status(500).json({ error: 'Could not generate invoice PDF' });
    }
  });

  async function sendInvoiceEmailRoute(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    const invoice = await store.getInvoice(id, deliveryInvoiceFields);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const [client, lines] = await Promise.all([
      invoice.client_id ? store.getClient(invoice.client_id, deliveryClientFields) : null,
      store.getInvoiceLines(invoice.id)
    ]);
    if (!client) return res.status(400).json({ error: 'Invoice client not found' });
    const [invoiceAccessToken, clientAccessToken] = await Promise.all([
      invoice.access_token || store.ensureInvoiceAccessToken(invoice.id),
      client.access_token || store.ensureClientAccessToken(client.id)
    ]);
    if (!invoice.access_token) invoice.access_token = invoiceAccessToken;
    if (!client.access_token) client.access_token = clientAccessToken;
    try {
      const result = await sendInvoiceEmail({ invoice, client, lines });
      const recipient = result?.recipient || client.email || client.email_accounting;
      const emailSend = await store.recordInvoiceEmailSend(invoice.id, recipient);
      if (invoice.status === 'draft') {
        const updated = await store.updateInvoice(invoice.id, { status: 'sent' }, ['status']);
        await writeHistory(store, req, {
          entityType: 'invoice', entityId: invoice.id, action: 'email_sent', changeMode: 'updated',
          before: { status: 'draft' }, after: { status: updated.status }, fields: ['status']
        });
      }
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
    const lines = await store.getInvoiceLines(Number(req.params.invoice_id));
    res.json(req.recordAccess ? lines.map(publicLine) : lines);
  });

  router.post('/invoices/:invoice_id/lines', async (req, res) => {
    const invoiceId = Number(req.params.invoice_id);
    const line = await store.createInvoiceLine(invoiceId, req.body);
    await writeHistory(store, req, {
      entityType: 'invoice', entityId: invoiceId, action: 'line_created', changeMode: 'created',
      after: line, fields: historyFields.invoiceLine
    });
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
    const beforeLines = structuredClone(await store.getInvoiceLines(invoiceId));
    const updatedLines = await store.replaceInvoiceLines(invoiceId, lines);
    if (!updatedLines) return res.status(404).json({ error: 'Invoice not found' });
    await writeHistory(store, req, {
      entityType: 'invoice', entityId: invoiceId, action: 'lines_replaced', changeMode: 'updated',
      before: { lines: beforeLines }, after: { lines: updatedLines }, fields: ['lines']
    });
    return res.json(updatedLines);
  });

  router.get('/invoices/:invoice_id/lines/:id', async (req, res) => {
    const line = await store.getInvoiceLine(Number(req.params.invoice_id), Number(req.params.id));
    if (!line) return res.status(404).json({ error: 'Invoice line not found' });
    return res.json(line);
  });

  router.get('/invoices/:id/email', sendInvoiceEmailRoute);
  router.post('/invoices/:id/email', sendInvoiceEmailRoute);

  router.get('/invoices/:id/email-sends', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invoice id must be a positive integer' });
    if (!await store.hasInvoice(id)) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(await store.getInvoiceEmailSends(id));
  });

  return router;
}
