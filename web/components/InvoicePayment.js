'use client';

import { useState } from 'react';
import { ArrowRight, Check, Copy, CreditCard, Landmark } from 'lucide-react';
import { browserApiBaseUrl, formatMoney } from '../lib/api.js';
import { companyInfo } from '@seferbiz/company';

export default function InvoicePayment({ invoiceId, accessToken, methods = [], amount, currency }) {
  const [pendingMethod, setPendingMethod] = useState('');
  const [error, setError] = useState('');
  const [zelleCopied, setZelleCopied] = useState(false);
  const fromCents = (cents) => formatMoney(cents / 100, currency);
  const amountLabel = formatMoney(amount, currency);
  const invoiceReference = `Invoice #${String(invoiceId).padStart(4, '0')}`;

  async function copyZelleDetails() {
    setError('');
    setZelleCopied(false);
    try {
      await navigator.clipboard.writeText(`Zelle recipient: ${companyInfo.emailContact}\nAmount: ${amountLabel}\nMemo: ${invoiceReference}`);
      setZelleCopied(true);
    } catch {
      setError('Could not copy payment details. Please try again or use another payment method.');
    }
  }

  async function startCheckout(method) {
    setPendingMethod(method);
    setError('');
    try {
      const response = await fetch(
        `${browserApiBaseUrl}/invoices/${invoiceId}/checkout?access_token=${encodeURIComponent(accessToken)}`,
        { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method }) }
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
      <div className="section-heading"><h2>Choose a payment method</h2><span className="section-note">Card and ACH payments open Stripe&apos;s secure checkout</span></div>
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
            <div className="payment-choice-heading">
              {option.method === 'card'
                ? <CreditCard className="payment-choice-icon" size={21} aria-hidden="true" />
                : <Landmark className="payment-choice-icon" size={21} aria-hidden="true" />}
              <strong>{option.label}</strong>
            </div>
            <span>{fromCents(option.total_cents)}</span>
            <small>{option.fee_cents ? `Estimated processing fee: ${fromCents(option.fee_cents)}` : 'No estimated processing fee'}</small>
            <span className="payment-choice-action">{pendingMethod === option.method ? 'Opening checkout...' : 'Continue to Stripe'} <ArrowRight size={16} aria-hidden="true" /></span>
          </button>
        ))}
        <button className="payment-choice" disabled={Boolean(pendingMethod)} onClick={copyZelleDetails} type="button">
          <div className="payment-choice-heading">
            <svg className="payment-choice-icon payment-choice-icon-zelle" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M13.559 24h-2.841a.483.483 0 0 1-.483-.483v-2.765H5.638a.667.667 0 0 1-.666-.666v-2.234a.67.67 0 0 1 .142-.412l8.139-10.382h-7.25a.667.667 0 0 1-.667-.667V3.914c0-.367.299-.666.666-.666h4.23V.483c0-.266.217-.483.483-.483h2.841c.266 0 .483.217.483.483v2.765h4.323c.367 0 .666.299.666.666v2.137a.67.67 0 0 1-.141.41l-8.19 10.481h7.665c.367 0 .666.299.666.666v2.477a.667.667 0 0 1-.666.667h-4.32v2.765a.483.483 0 0 1-.483.483Z" />
            </svg>
            <strong>Zelle</strong>
          </div>
          <span>{amountLabel}</span>
          <small>No processing fee · Send to {companyInfo.emailContact}</small>
          <span className="payment-choice-action" aria-live="polite">{zelleCopied ? 'Payment details copied' : 'Copy payment details'} {zelleCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</span>
        </button>
      </div>
      {error && <p className="action-error" role="alert">{error}</p>}
    </section>
  );
}
