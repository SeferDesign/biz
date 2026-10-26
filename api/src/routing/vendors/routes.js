import { Router } from 'express';
import { hasText, parseId } from '../shared/validation.js';

export default function vendorsRouter(store) {
  const router = Router();

  router.get('/vendors', async (req, res) => {
    const vendors = (await store.getSnapshot()).vendors;
    const sortableName = (name) => name.replace(/^(the|a|an)\s+/i, '');
    return res.json([...vendors].sort((left, right) => sortableName(left.name).localeCompare(sortableName(right.name))));
  });

  router.get('/vendors/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Vendor id must be a positive integer' });
    const vendor = await store.getVendor(id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.json(vendor);
  });

  router.post('/vendors', async (req, res) => {
    if (!hasText(req.body?.name)) return res.status(400).json({ error: 'Vendor name is required' });
    return res.status(201).json(await store.createVendor(req.body));
  });

  router.patch('/vendors/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Vendor id must be a positive integer' });
    if (req.body?.name !== undefined && !hasText(req.body.name)) {
      return res.status(400).json({ error: 'Vendor name cannot be empty' });
    }
    if (!Object.keys(req.body || {}).length) return res.status(400).json({ error: 'At least one vendor field is required' });
    const vendor = await store.updateVendor(id, req.body);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.json(vendor);
  });

  router.put('/vendors/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Vendor id must be a positive integer' });
    if (!hasText(req.body?.name)) return res.status(400).json({ error: 'Vendor name is required' });
    const vendor = await store.updateVendor(id, req.body);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.json(vendor);
  });

  router.delete('/vendors/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Vendor id must be a positive integer' });
    if (!await store.deleteVendor(id)) return res.status(404).json({ error: 'Vendor not found' });
    return res.sendStatus(204);
  });

  return router;
}
