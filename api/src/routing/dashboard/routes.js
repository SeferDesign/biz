import { Router } from 'express';
import { withInvoiceDisplayIds } from '@seferbiz/company';

export default function dashboardRouter(store) {
  const router = Router();
  router.get('/dashboard', async (req, res) => {
    const summary = await store.getDashboardSummary();
    summary.recentInvoices = summary.recentInvoices.map((invoice) =>
      withInvoiceDisplayIds(invoice, invoice.client_name));
    return res.json(summary);
  });
  return router;
}