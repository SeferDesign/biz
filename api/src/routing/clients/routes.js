import { Router } from 'express';

export default function clientsRouter(store) {
  const router = Router();

  router.get('/v1/clients', async (req, res) => res.json((await store.getSnapshot()).clients));

  router.get('/v1/clients/:id', async (req, res) => {
    const clients = (await store.getSnapshot()).clients;
    const client = clients.find((item) => item.id === Number(req.params.id));
    if (!client) return res.status(404).json({ error: 'Client not found' });
    return res.json(client);
  });

  return router;
}
