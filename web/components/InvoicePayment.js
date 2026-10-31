'use client';

import { useState } from 'react';
import { Button } from './ui/button.js';
import { ArrowRight, Check, Copy, CreditCard, Landmark } from 'lucide-react';
import { Spinner } from './ui/spinner.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Separator } from './ui/separator.js';
import { browserApiBaseUrl, formatMoney } from '../lib/api.js';
import { companyInfo, displayIdNumber } from '@seferbiz/company';

export default function InvoicePayment({ invoiceId, accessToken, methods = [], amount, currency }) {
  const [pendingMethod, setPendingMethod] = useState('');
  const [error, setError] = useState('');
  const [zelleCopied, setZelleCopied] = useState(false);
  const [copyingZelle, setCopyingZelle] = useState(false);
  const fromCents = (cents) => formatMoney(cents / 100, currency);
  const amountLabel = formatMoney(amount, currency);
  const invoiceReference = `Invoice #${displayIdNumber(invoiceId)}`;

  async function copyZelleDetails() {
    setError('');
    setZelleCopied(false);
    setCopyingZelle(true);
    try {
      await navigator.clipboard.writeText(`Zelle recipient: ${companyInfo.emailContact}\nAmount: ${amountLabel}\nMemo: ${invoiceReference}`);
      setZelleCopied(true);
    } catch {
      setError('Could not copy payment details. Please try again or use another payment method.');
    } finally {
      setCopyingZelle(false);
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
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Choose a payment method</h2>
        <p className="text-sm text-muted-foreground">Review the total and any processing fee before continuing.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {methods.map((option) => (
          <Card className="flex h-full flex-col" key={option.method}>
            <CardHeader className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                {option.method === 'card'
                  ? <CreditCard className="size-5 text-muted-foreground" aria-hidden="true" />
                  : <Landmark className="size-5 text-muted-foreground" aria-hidden="true" />}
                <CardTitle className="text-base">{option.label}</CardTitle>
              </div>
              <CardDescription>{option.fee_cents ? `Includes an estimated processing fee of ${fromCents(option.fee_cents)}` : 'No estimated processing fee'}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              <Separator />
              <p className="text-2xl font-semibold tabular-nums">{fromCents(option.total_cents)}</p>
              <Button
                className="w-full justify-between"
                disabled={Boolean(pendingMethod)}
                aria-busy={pendingMethod === option.method}
                onClick={() => startCheckout(option.method)}
                type="button"
              >
                {pendingMethod === option.method ? 'Opening checkout...' : 'Pay now'}
                {pendingMethod === option.method ? <Spinner /> : <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M13.559 24h-2.841a.483.483 0 0 1-.483-.483v-2.765H5.638a.667.667 0 0 1-.666-.666v-2.234a.67.67 0 0 1 .142-.412l8.139-10.382h-7.25a.667.667 0 0 1-.667-.667V3.914c0-.367.299-.666.666-.666h4.23V.483c0-.266.217-.483.483-.483h2.841c.266 0 .483.217.483.483v2.765h4.323c.367 0 .666.299.666.666v2.137a.67.67 0 0 1-.141.41l-8.19 10.481h7.665c.367 0 .666.299.666.666v2.477a.667.667 0 0 1-.666.667h-4.32v2.765a.483.483 0 0 1-.483.483Z" />
              </svg>
              <CardTitle className="text-base">Zelle</CardTitle>
            </div>
            <CardDescription>Send to {companyInfo.emailContact}.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <Separator />
            <p className="text-2xl font-semibold tabular-nums">{amountLabel}</p>
            <Button className="w-full justify-between" variant="outline" disabled={Boolean(pendingMethod) || copyingZelle} aria-busy={copyingZelle} onClick={copyZelleDetails} type="button">
              {copyingZelle ? 'Copying payment details...' : zelleCopied ? 'Payment details copied' : 'Copy payment details'}
              {copyingZelle ? <Spinner /> : zelleCopied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            </Button>
          </CardContent>
        </Card>
      </div>
      {error && <p className="action-error" role="alert">{error}</p>}
    </section>
  );
}
