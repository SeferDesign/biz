'use client';

import { useState } from 'react';
import { browserApiBaseUrl, formatMoney } from '../lib/api.js';

export default function InvoicePayment({ invoiceId, accessToken, methods, currency }) {
  const [pendingMethod, setPendingMethod] = useState('');
  const [error, setError] = useState('');
  const fromCents = (cents) => formatMoney(cents / 100, currency);

  async function startCheckout(method) {
    setPendingMethod(method);
    setError('');
    try {
      const response = await fetch(
        `${browserApiBaseUrl}/invoices/${invoiceId}/checkout?access_token=${encodeURIComponent(accessToken)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method }) }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.url) throw new Error(body?.error || `Checkout could not be started (${response.status})`);
      if (new URL(body.url).origin !== 'https://checkout.stripe.com') throw new Error('Unexpected checkout address.');
      window.location.assign(body.url);
    } catch (checkoutError) {
      setError(checkoutError.message || 'Checkout could not be started.');
      setPendingMethod('');
    }
  }

  return (
    <section className="detail-section invoice-payment">
      <div className="section-heading"><h2>Pay online</h2><span className="section-note">Opens Stripe&apos;s secure checkout, then returns you here</span></div>
      <div className="payment-choices">
        {methods.map((option) => (
          <button
            className="payment-choice"
            disabled={Boolean(pendingMethod)}
            aria-busy={pendingMethod === option.method}
            key={option.method}
            onClick={() => startCheckout(option.method)}
            type="button"
          >
            <strong>{pendingMethod === option.method ? 'Opening checkout...' : option.label}</strong>
            <span>{fromCents(option.total_cents)}</span>
            <small>{option.fee_cents ? `Includes ${fromCents(option.fee_cents)} processing fee` : 'No processing fee'}</small>
          </button>
        ))}
      </div>
      {error && <p className="action-error" role="alert">{error}</p>}
    </section>
  );
}
