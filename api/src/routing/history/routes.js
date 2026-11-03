import { Router } from 'express';
import { parseId, parsePagination } from '../shared/validation.js';

const entityTypes = new Set(['client', 'invoice', 'expense', 'recurring_expense', 'vendor', 'year']);

export default function historyRouter(store) {
  const router = Router();
  router.get('/history', async (req, res) => {
    const pagination = parsePagination(req.query);
    if (pagination === false) return res.status(400).json({ error: 'Invalid pagination parameters' });
    const entityType = req.query.entity_type;
    if (entityType !== undefined && !entityTypes.has(entityType)) {
      return res.status(400).json({ error: 'Unsupported history entity type' });
    }
    const entityId = req.query.entity_id === undefined ? null : parseId(req.query.entity_id);
    if (req.query.entity_id !== undefined && !entityId) {
      return res.status(400).json({ error: 'History entity id must be a positive integer' });
    }
    const page = pagination || { page: 1, pageSize: 20, offset: 0 };
    const result = await store.listHistory({ ...page, entityType, entityId });
    return res.json({ ...result, page: page.page, pageSize: page.pageSize });
  });
  return router;
}
