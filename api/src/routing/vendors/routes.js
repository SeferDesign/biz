import { Router } from 'express';
import { vendors } from '../shared/data.js';

const router = Router();

router.get('/vendors', (req, res) => {
  const sortableName = (name) => name.replace(/^(the|a|an)\s+/i, '');
  return res.json([...vendors].sort((left, right) => sortableName(left.name).localeCompare(sortableName(right.name))));
});

export default router;
