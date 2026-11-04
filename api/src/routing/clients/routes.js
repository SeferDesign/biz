import { Router } from 'express';
import { hasText, parseId, parsePagination } from '../shared/validation.js';
import { publicClient } from '../shared/public-views.js';
import { withInvoiceDisplayIds } from '@seferbiz/company';
import { invoiceClientFields, publicInvoice } from '../shared/public-views.js';
import { historyFields, writeHistory } from '../shared/history.js';

const paymentTerms = new Set(['Net 15', 'Net 30', 'Net 60', 'Net 90']);
const preferredPaymentMethods = new Set(['Check', 'Credit Card', 'Zelle', 'PayPal', 'Stripe', 'ACH', 'Cryptocurrency', 'Cash', 'Venmo', 'Other']);

function invalidPaymentTerms(body) {
  return body?.payment_terms !== undefined && !paymentTerms.has(body.payment_terms);
}

function invalidPreferredPaymentMethod(body) {
  const method = body?.preferred_paymenttype;
  return method !== undefined && method !== null && method !== '' && !preferredPaymentMethods.has(method);
}

function normalizeClientInput(body) {
  return body.preferred_paymenttype === '' ? { ...body, preferred_paymenttype: null } : body;
}

export default function clientsRouter(store) {
  const router = Router();

  router.get('/clients', async (req, res) => {
    const pagination = parsePagination(req.query);
    if (pagination === false) return res.status(400).json({ error: 'Invalid pagination parameters' });
    if (!pagination) return res.json((await store.getSnapshot({ clients: true })).clients);
    const result = await store.listClients(pagination);
    return res.json({ ...result, page: pagination.page, pageSize: pagination.pageSize });
  });

  router.get('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    const client = await store.getClient(id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    return res.json(req.recordAccess ? publicClient(client) : client);
  });

  router.post('/clients/:id/access-token', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    const accessToken = await store.ensureClientAccessToken(id);
    if (!accessToken) return res.status(404).json({ error: 'Client not found' });
    return res.json({ access_token: accessToken });
  });

  router.get('/clients/:id/invoices', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    const client = await (req.recordAccess ? store.getClient(id, invoiceClientFields) : store.getClientName(id));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const invoices = (await store.getClientInvoices(id))
      .map((invoice) => {
        const invoiceWithDisplayIds = withInvoiceDisplayIds(invoice, client.name);
        return req.recordAccess ? publicInvoice(invoiceWithDisplayIds, client) : invoiceWithDisplayIds;
      });
    return res.json(invoices);
  });

  router.post('/clients', async (req, res) => {
    if (!hasText(req.body?.name)) return res.status(400).json({ error: 'Client name is required' });
    if (invalidPaymentTerms(req.body)) return res.status(400).json({ error: 'Payment terms must be Net 15, Net 30, Net 60, or Net 90' });
    if (invalidPreferredPaymentMethod(req.body)) return res.status(400).json({ error: 'Preferred payment method is not supported' });
    const client = await store.createClient(normalizeClientInput(req.body));
    await writeHistory(store, req, { entityType: 'client', entityId: client.id, action: 'created', after: client, fields: historyFields.client });
    return res.status(201).json(client);
  });

  router.patch('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    if (req.body?.name !== undefined && !hasText(req.body.name)) {
      return res.status(400).json({ error: 'Client name cannot be empty' });
    }
    if (invalidPaymentTerms(req.body)) return res.status(400).json({ error: 'Payment terms must be Net 15, Net 30, Net 60, or Net 90' });
    if (invalidPreferredPaymentMethod(req.body)) return res.status(400).json({ error: 'Preferred payment method is not supported' });
    if (!Object.keys(req.body || {}).length) {
      return res.status(400).json({ error: 'At least one client field is required' });
    }
    const current = await store.getClient(id);
    const before = current ? structuredClone(current) : null;
    const client = await store.updateClient(id, normalizeClientInput(req.body));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await writeHistory(store, req, { entityType: 'client', entityId: id, action: 'updated', before, after: client, fields: historyFields.client });
    return res.json(client);
  });

  router.put('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    if (!hasText(req.body?.name)) return res.status(400).json({ error: 'Client name is required' });
    if (invalidPaymentTerms(req.body)) return res.status(400).json({ error: 'Payment terms must be Net 15, Net 30, Net 60, or Net 90' });
    if (invalidPreferredPaymentMethod(req.body)) return res.status(400).json({ error: 'Preferred payment method is not supported' });
    const current = await store.getClient(id);
    const before = current ? structuredClone(current) : null;
    const client = await store.updateClient(id, normalizeClientInput(req.body));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await writeHistory(store, req, { entityType: 'client', entityId: id, action: 'updated', before, after: client, fields: historyFields.client });
    return res.json(client);
  });

  router.delete('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    const before = await store.getClient(id);
    if (!before || !await store.deleteClient(id)) return res.status(404).json({ error: 'Client not found' });
    await writeHistory(store, req, { entityType: 'client', entityId: id, action: 'deleted', before, fields: historyFields.client });
    return res.sendStatus(204);
  });

  return router;
}
