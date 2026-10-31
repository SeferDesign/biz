import { Router } from 'express';
import { parseId } from '../shared/validation.js';

function validateTemplate(input, { partial = false } = {}) {
  if (!partial || input.name !== undefined) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) {
      return 'Template name must be between 1 and 120 characters';
    }
  }
  if (!partial || input.description !== undefined) {
    if (typeof input.description !== 'string' || !input.description.trim() || input.description.length > 10000) {
      return 'Template description must be between 1 and 10000 characters';
    }
  }
  if (input.client_id !== undefined && input.client_id !== null && !parseId(input.client_id)) {
    return 'Client id must be a positive integer';
  }
  return null;
}

function normalizeTemplate(input) {
  return {
    ...input,
    ...(input.name === undefined ? {} : { name: input.name.trim() }),
    ...(input.description === undefined ? {} : { description: input.description.trim() }),
    ...(input.client_id === undefined ? {} : { client_id: input.client_id === null ? null : Number(input.client_id) })
  };
}

export default function invoiceTemplatesRouter(store) {
  const router = Router();

  router.get('/invoice-templates', async (req, res) => {
    let clientId;
    if (req.query.client_id !== undefined) {
      clientId = parseId(req.query.client_id);
      if (!clientId) return res.status(400).json({ error: 'Client id must be a positive integer' });
    }
    return res.json(await store.listInvoiceTemplates(clientId));
  });

  router.post('/invoice-templates', async (req, res) => {
    const input = normalizeTemplate(req.body || {});
    const error = validateTemplate(input);
    if (error) return res.status(400).json({ error });
    if (input.client_id != null && !await store.getClient(input.client_id)) {
      return res.status(400).json({ error: 'Client not found' });
    }
    return res.status(201).json(await store.createInvoiceTemplate(input));
  });

  router.patch('/invoice-templates/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Template id must be a positive integer' });
    const input = normalizeTemplate(req.body || {});
    if (!Object.keys(input).length) return res.status(400).json({ error: 'At least one template field is required' });
    const error = validateTemplate(input, { partial: true });
    if (error) return res.status(400).json({ error });
    if (input.client_id != null && !await store.getClient(input.client_id)) {
      return res.status(400).json({ error: 'Client not found' });
    }
    const template = await store.updateInvoiceTemplate(id, input);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    return res.json(template);
  });

  router.delete('/invoice-templates/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Template id must be a positive integer' });
    if (!await store.deleteInvoiceTemplate(id)) return res.status(404).json({ error: 'Template not found' });
    return res.sendStatus(204);
  });

  return router;
}