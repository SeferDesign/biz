import { Router } from 'express';

export default function vendorsRouter(store) {
  const router = Router();

  router.get('/vendors', async (req, res) => {
    const vendors = (await store.getSnapshot()).vendors;
    const sortableName = (name) => name.replace(/^(the|a|an)\s+/i, '');
    return res.json([...vendors].sort((left, right) => sortableName(left.name).localeCompare(sortableName(right.name))));
  });

  return router;
}
