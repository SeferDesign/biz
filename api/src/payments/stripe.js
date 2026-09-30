import Stripe from 'stripe';
import { parseId } from '../routing/shared/validation.js';

// Stripe rejects USD charges below $0.50.
export const minimumChargeCents = 50;

const methods = {
  card: { label: 'Credit or debit card', paymenttype: 'Stripe', feeRate: 0.029, feeFixedCents: 30 },
  us_bank_account: { label: 'Bank account (ACH)', paymenttype: 'Stripe ACH', feeRate: 0.008, feeFixedCents: 0, feeCapCents: 500 }
};

export function createStripeClient(secretKey = process.env.STRIPE_SECRET_KEY) {
  return secretKey ? new Stripe(secretKey) : null;
}

export function invoiceAmountCents(invoice) {
  return Math.round(Number(invoice.cost ?? invoice.total ?? 0) * 100);
}

export function isInvoicePayable(invoice) {
  return !invoice.paid && invoice.status !== 'paid' && invoiceAmountCents(invoice) >= minimumChargeCents;
}

export function paymentMethodsFor(invoice) {
  const currency = (invoice.currency || 'USD').toUpperCase();
  return Object.keys(methods).filter((method) => method !== 'us_bank_account' || currency === 'USD');
}

export function paymentBreakdown(invoice, method) {
  const { label, feeRate, feeFixedCents, feeCapCents } = methods[method];
  const amount = invoiceAmountCents(invoice);
  // Gross up so the payout after Stripe's fee still covers the invoice amount.
  const uncappedTotal = feeRate || feeFixedCents ? Math.round((amount + feeFixedCents) / (1 - feeRate)) : amount;
  const fee = Math.min(uncappedTotal - amount, feeCapCents ?? Infinity);
  return { method, label, amount_cents: amount, fee_cents: fee, total_cents: amount + fee };
}

export async function recordCheckoutPayment(store, session, status, { failureMessage = null, notify } = {}) {
  const invoiceId = parseId(session?.metadata?.invoice_id);
  const invoice = invoiceId ? await store.getInvoice(invoiceId) : null;
  if (!invoice) return;
  const payment = {
    invoice_id: invoiceId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    method: session.metadata.payment_method || null,
    amount: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
    currency: (session.currency || 'usd').toUpperCase(),
    status,
    failure_message: failureMessage
  };
  if (!await store.recordInvoicePayment(payment) || !notify) return;
  try {
    const client = invoice.client_id ? await store.getClient(invoice.client_id) : null;
    await notify({ payment, invoice, client, livemode: Boolean(session.livemode) });
  } catch (error) {
    // A notification failure must not make Stripe retry an already-recorded event.
    console.error(`Payment notification failed for invoice ${invoiceId}:`, error.message);
  }
}

export async function fulfillCheckoutSession(store, session) {
  const invoiceId = parseId(session?.metadata?.invoice_id);
  if (!invoiceId || session.payment_status !== 'paid') return false;
  return store.markInvoicePaid(invoiceId, {
    paiddate: new Date().toISOString().slice(0, 10),
    paymenttype: methods[session.metadata.payment_method]?.paymenttype || 'Stripe'
  });
}

export async function ensureStripeCustomer(stripe, store, client) {
  if (!client) return undefined;
  const details = {
    name: client.name || undefined,
    email: client.email_accounting || client.email || undefined,
    metadata: { seferbiz_client_id: String(client.id) }
  };
  if (client.address1) {
    details.address = {
      line1: client.address1,
      line2: client.address2 || undefined,
      city: client.city || undefined,
      state: client.state || undefined,
      postal_code: client.zipcode || undefined
    };
  }
  if (client.stripe_customer_id) {
    try {
      await stripe.customers.update(client.stripe_customer_id, details);
      return client.stripe_customer_id;
    } catch (error) {
      if (error?.code !== 'resource_missing') throw error;
    }
  }
  const customer = await stripe.customers.create(details);
  await store.setClientStripeCustomerId(client.id, customer.id);
  return customer.id;
}
