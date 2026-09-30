import { Router } from 'express';
import { hasText, parseId } from '../shared/validation.js';
import { publicClient } from '../shared/public-views.js';

export default function clientsRouter(store) {
  const router = Router();

  router.get('/clients', async (req, res) => res.json((await store.getSnapshot()).clients));

  router.get('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    const client = await store.getClient(id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    return res.json(req.recordAccess ? publicClient(client) : client);
  });

  router.post('/clients', async (req, res) => {
    if (!hasText(req.body?.name)) return res.status(400).json({ error: 'Client name is required' });
    return res.status(201).json(await store.createClient(req.body));
  });

  router.patch('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    if (req.body?.name !== undefined && !hasText(req.body.name)) {
      return res.status(400).json({ error: 'Client name cannot be empty' });
    }
    if (!Object.keys(req.body || {}).length) {
      return res.status(400).json({ error: 'At least one client field is required' });
    }
    const client = await store.updateClient(id, req.body);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    return res.json(client);
  });

  router.put('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    if (!hasText(req.body?.name)) return res.status(400).json({ error: 'Client name is required' });
    const client = await store.updateClient(id, req.body);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    return res.json(client);
  });

  router.delete('/clients/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Client id must be a positive integer' });
    if (!await store.deleteClient(id)) return res.status(404).json({ error: 'Client not found' });
    return res.sendStatus(204);
  });

  return router;
}
