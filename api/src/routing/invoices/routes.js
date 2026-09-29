import { Router } from 'express';
import { clients, invoiceLines, invoices } from '../shared/data.js';

const router = Router();

router.get('/v1/invoices', (req, res) => res.json(invoices));

router.post('/v1/invoices', (req, res) => {
  const invoice = {
    id: invoices.length ? Math.max(...invoices.map((item) => item.id)) + 1 : 1,
    ...req.body,
    status: req.body.status || 'draft'
  };
  invoices.push(invoice);
  res.status(201).json(invoice);
});

router.get('/v1/invoices/:id', (req, res) => {
  const invoice = invoices.find((item) => item.id === Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  return res.json(invoice);
});

function queueInvoiceEmail(invoice, res) {
  return res.json({
    invoice_id: invoice.id,
    status: 'queued',
    recipient: clients.find((client) => client.id === invoice.client_id)?.email || 'billing@example.com',
    message: 'Invoice email queued for delivery.'
  });
}

router.get('/v1/invoices/:id/email', (req, res) => {
  const invoice = invoices.find((item) => item.id === Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  return queueInvoiceEmail(invoice, res);
});

router.get('/v1/invoices/:invoice_id/lines', (req, res) => {
  res.json(invoiceLines[Number(req.params.invoice_id)] || []);
});

router.post('/v1/invoices/:invoice_id/lines', (req, res) => {
  const invoiceId = Number(req.params.invoice_id);
  const currentLines = invoiceLines[invoiceId] || [];
  const line = {
    id: currentLines.length ? Math.max(...currentLines.map((item) => item.id)) + 1 : 1,
    invoice_id: invoiceId,
    ...req.body
  };
  invoiceLines[invoiceId] = [...currentLines, line];
  res.status(201).json(line);
});

router.get('/v1/invoices/:invoice_id/lines/:id', (req, res) => {
  const invoiceId = Number(req.params.invoice_id);
  const lineId = Number(req.params.id);
  const line = (invoiceLines[invoiceId] || []).find((item) => item.id === lineId);
  if (!line) return res.status(404).json({ error: 'Invoice line not found' });
  return res.json(line);
});

router.get('/invoices/:id/email', (req, res) => {
  const invoice = invoices.find((item) => item.id === Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  return queueInvoiceEmail(invoice, res);
});

router.get('/invoices/:id/stripe', (req, res) => {
  const invoice = invoices.find((item) => item.id === Number(req.params.id));
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const sessionId = req.query.session_id;
  if (!sessionId || sessionId !== invoice.stripe_session_id) {
    return res.status(400).json({ error: 'Invalid Stripe session' });
  }
  invoice.status = 'paid';
  invoice.paid = true;
  invoice.paiddate = new Date().toISOString().slice(0, 10);
  invoice.paymenttype = 'Stripe';
  return res.json({ invoice_id: invoice.id, status: 'paid', paiddate: invoice.paiddate });
});

export default router;