import { Router } from 'express';
import { parseId } from '../shared/validation.js';
import { displayId } from '@seferbiz/company';
import {
  ensureStripeCustomer,
  fulfillCheckoutSession,
  isInvoicePayable,
  paymentBreakdown,
  paymentMethodsFor,
  recordCheckoutPayment
} from '../../payments/stripe.js';

const toAmount = (cents) => cents / 100;
const toIsoDate = (seconds) => new Date(seconds * 1000).toISOString();

export function createStripeWebhookHandler(store, { stripe, webhookSecret, notify }) {
  return async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).json({ error: 'Stripe webhooks are not configured' });
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature') || '', webhookSecret);
    } catch {
      return res.status(400).json({ error: 'Invalid Stripe signature' });
    }

    const session = event.data.object;
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      await recordCheckoutPayment(store, session, session.payment_status === 'paid' ? 'succeeded' : 'processing', { notify });
      await fulfillCheckoutSession(store, session);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      const paymentIntent = paymentIntentId ? await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null) : null;
      await recordCheckoutPayment(store, session, 'failed', {
        failureMessage: paymentIntent?.last_payment_error?.message?.slice(0, 500) || null,
        notify
      });
      // Release the failed session so the client can start a new payment.
      const invoice = await store.getInvoice(parseId(session.metadata?.invoice_id));
      if (invoice?.stripe_session_id === session.id) await store.setInvoiceStripeSession(invoice.id, null);
    }
    return res.json({ received: true });
  };
}

export default function stripeRouter(store, { stripe, appUrl, notify }) {
  const router = Router();
  const enabled = Boolean(stripe && appUrl);
  const baseAppUrl = appUrl?.replace(/\/$/, '');

  async function loadInvoice(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invoice id must be a positive integer' });
      return null;
    }
    const invoice = await store.getInvoice(id);
    if (!invoice) res.status(404).json({ error: 'Invoice not found' });
    return invoice || null;
  }

  router.get('/invoices/:id/payment-options', async (req, res) => {
    const invoice = await loadInvoice(req, res);
    if (!invoice) return undefined;
    const processing = invoice.payment_status === 'processing';
    const payable = enabled && isInvoicePayable(invoice) && !processing;
    return res.json({
      enabled: payable,
      processing,
      currency: invoice.currency || 'USD',
      methods: payable ? paymentMethodsFor(invoice).map((method) => paymentBreakdown(invoice, method)) : []
    });
  });

  router.post('/invoices/:id/checkout', async (req, res) => {
    if (!enabled) return res.status(503).json({ error: 'Online payments are not configured' });
    const invoice = await loadInvoice(req, res);
    if (!invoice) return undefined;
    if (!isInvoicePayable(invoice)) return res.status(409).json({ error: 'This invoice cannot be paid online' });
    if (invoice.payment_status === 'processing') {
      return res.status(409).json({ error: 'A payment for this invoice is already processing' });
    }
    const method = req.body?.method;
    if (!paymentMethodsFor(invoice).includes(method)) return res.status(400).json({ error: 'Unsupported payment method' });

    try {
      if (invoice.stripe_session_id) {
        const previous = await stripe.checkout.sessions.retrieve(invoice.stripe_session_id).catch(() => null);
        if (previous?.status === 'complete') {
          return res.status(409).json({ error: 'A payment for this invoice is already processing' });
        }
        if (previous?.status === 'open') await stripe.checkout.sessions.expire(previous.id);
      }

      const accessToken = invoice.access_token || await store.ensureInvoiceAccessToken(invoice.id);
      const client = invoice.client_id ? await store.getClient(invoice.client_id) : null;
      const customer = await ensureStripeCustomer(stripe, store, client);
      const breakdown = paymentBreakdown(invoice, method);
      const currency = (invoice.currency || 'USD').toLowerCase();
      const invoiceName = `Invoice ${displayId(client?.name, invoice.id)}`;
      const metadata = { invoice_id: String(invoice.id), payment_method: method };
      const lineItem = (name, unitAmount) => ({
        quantity: 1,
        price_data: { currency, unit_amount: unitAmount, product_data: { name } }
      });

      const invoiceUrl = `${baseAppUrl}/invoices/${invoice.id}?access_token=${encodeURIComponent(accessToken)}`;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer,
        client_reference_id: String(invoice.id),
        line_items: [
          lineItem(invoiceName, breakdown.amount_cents),
          ...(breakdown.fee_cents ? [lineItem(method === 'us_bank_account' ? 'ACH processing fee' : 'Card processing fee', breakdown.fee_cents)] : [])
        ],
        payment_method_types: [method],
        ...(method === 'us_bank_account' ? {
          payment_method_options: {
            us_bank_account: { verification_method: 'automatic', financial_connections: { permissions: ['payment_method'] } }
          }
        } : {}),
        payment_intent_data: { description: invoiceName, metadata },
        metadata,
        success_url: `${invoiceUrl}&checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${invoiceUrl}&checkout=canceled`
      });
      await store.setInvoiceStripeSession(invoice.id, session.id);
      return res.status(201).json({ url: session.url });
    } catch (error) {
      return res.status(502).json({ error: error?.message || 'Stripe checkout could not be started' });
    }
  });

  router.get('/invoices/:id/stripe', async (req, res) => {
    const invoice = await loadInvoice(req, res);
    if (!invoice) return undefined;
    const sessionId = req.query.session_id;
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid Stripe session' });
    }
    if (!stripe) return res.status(503).json({ error: 'Online payments are not configured' });

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return res.status(400).json({ error: 'Invalid Stripe session' });
    }
    if (session.metadata?.invoice_id !== String(invoice.id)) return res.status(400).json({ error: 'Invalid Stripe session' });

    if (session.payment_status === 'paid') {
      await recordCheckoutPayment(store, session, 'succeeded', { notify });
      await fulfillCheckoutSession(store, session);
      const updated = await store.getInvoice(invoice.id);
      return res.json({ invoice_id: invoice.id, status: 'paid', paiddate: updated?.paiddate ?? null });
    }
    if (session.status === 'complete') await recordCheckoutPayment(store, session, 'processing', { notify });
    return res.json({ invoice_id: invoice.id, status: session.status === 'complete' ? 'processing' : session.status });
  });

  router.get('/invoices/:id/payments', async (req, res) => {
    const invoice = await loadInvoice(req, res);
    if (!invoice) return undefined;
    return res.json(await store.getInvoicePayments(invoice.id));
  });

  router.get('/stripe/payouts', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });
    try {
      const [payouts, paymentIntents] = await Promise.all([
        stripe.payouts.list({ limit: 100 }),
        stripe.paymentIntents.list({ limit: 100, expand: ['data.latest_charge.balance_transaction'] })
      ]);
      return res.json({
        payouts: payouts.data.map((payout) => ({
          id: payout.id,
          amount: toAmount(payout.amount),
          currency: payout.currency.toUpperCase(),
          arrival_date: toIsoDate(payout.arrival_date),
          status: payout.status
        })),
        payments: paymentIntents.data
          .filter((intent) => ['succeeded', 'processing'].includes(intent.status))
          .map((intent) => {
            const balanceTransaction = intent.latest_charge?.balance_transaction;
            const hasBalance = balanceTransaction && typeof balanceTransaction === 'object';
            return {
              id: intent.id,
              created: toIsoDate(intent.created),
              invoice_id: parseId(intent.metadata?.invoice_id),
              amount: toAmount(intent.amount),
              fee: hasBalance ? toAmount(balanceTransaction.fee) : null,
              net: hasBalance ? toAmount(balanceTransaction.net) : null,
              currency: intent.currency.toUpperCase(),
              status: intent.status,
              payment_method: intent.payment_method_types?.[0] || null
            };
          }),
        has_more: payouts.has_more || paymentIntents.has_more
      });
    } catch (error) {
      return res.status(502).json({ error: error?.message || 'Stripe data could not be loaded' });
    }
  });

  return router;
}
