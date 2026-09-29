import { Router } from 'express';

export default function expensesRouter(store) {
  const router = Router();

  router.get('/expenses', async (req, res) => {
    const expenses = (await store.getSnapshot()).expenses;
    const now = new Date().toISOString().slice(0, 10);
    const filtered = expenses.filter((expense) => {
      if (req.query.future === 'true') return expense.date > now;
      if (req.query.inactive === 'true') return expense.date <= now;
      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      return expense.date >= cutoff.toISOString().slice(0, 10) && expense.date <= now;
    });
    return res.json(filtered.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)));
  });

  return router;
}
