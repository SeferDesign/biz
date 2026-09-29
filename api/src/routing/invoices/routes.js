import { Router } from 'express';

export default function invoicesRouter(store) {
  const router = Router();

  router.get('/v1/invoices', async (req, res) => res.json((await store.getSnapshot()).invoices));

  router.post('/v1/invoices', async (req, res) => {
    const invoice = await store.createInvoice(req.body);
    res.status(201).json(invoice);
  });

  router.get('/v1/invoices/:id', async (req, res) => {
    const invoice = (await store.getSnapshot()).invoices.find((item) => item.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(invoice);
  });

  async function queueInvoiceEmail(invoice, res) {
    const clients = (await store.getSnapshot()).clients;
    return res.json({
      invoice_id: invoice.id,
      status: 'queued',
      recipient: clients.find((client) => client.id === invoice.client_id)?.email || 'billing@example.com',
      message: 'Invoice email queued for delivery.'
    });
  }

  router.get('/v1/invoices/:id/email', async (req, res) => {
    const invoice = (await store.getSnapshot()).invoices.find((item) => item.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return queueInvoiceEmail(invoice, res);
  });

  router.get('/v1/invoices/:invoice_id/lines', async (req, res) => {
    const lines = (await store.getSnapshot()).lines
      .filter((line) => line.invoice_id === Number(req.params.invoice_id));
    res.json(lines);
  });

  router.post('/v1/invoices/:invoice_id/lines', async (req, res) => {
    const line = await store.createInvoiceLine(Number(req.params.invoice_id), req.body);
    res.status(201).json(line);
  });

  router.get('/v1/invoices/:invoice_id/lines/:id', async (req, res) => {
    const snapshot = await store.getSnapshot();
    const line = snapshot.lines.find((item) =>
      item.invoice_id === Number(req.params.invoice_id) && item.id === Number(req.params.id));
    if (!line) return res.status(404).json({ error: 'Invoice line not found' });
    return res.json(line);
  });

  router.get('/invoices/:id/email', async (req, res) => {
    const invoice = (await store.getSnapshot()).invoices.find((item) => item.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return queueInvoiceEmail(invoice, res);
  });

  router.get('/invoices/:id/stripe', async (req, res) => {
    const invoice = (await store.getSnapshot()).invoices.find((item) => item.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const sessionId = req.query.session_id;
    if (!sessionId || sessionId !== invoice.stripe_session_id) {
      return res.status(400).json({ error: 'Invalid Stripe session' });
    }
    const paiddate = new Date().toISOString().slice(0, 10);
    await store.updateInvoice(invoice.id, { status: 'paid', paid: true, paiddate, paymenttype: 'Stripe' });
    return res.json({ invoice_id: invoice.id, status: 'paid', paiddate });
  });

  return router;
}
