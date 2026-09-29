import { Router } from 'express';
import { clients } from '../shared/data.js';

const router = Router();

router.get('/v1/clients', (req, res) => res.json(clients));

router.get('/v1/clients/:id', (req, res) => {
  const client = clients.find((item) => item.id === Number(req.params.id));
  if (!client) return res.status(404).json({ error: 'Client not found' });
  return res.json(client);
});

export default router;