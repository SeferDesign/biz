'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Copy, Mail } from 'lucide-react';
import { browserApiBaseUrl, invoiceStatus } from '../lib/api.js';
import { StatusBadge } from './ResourcePage.js';
import { Button } from './ui/button.js';
import { ButtonGroup } from './ui/button-group.js';
import { toast } from 'sonner';
import { Spinner } from './ui/spinner.js';

export default function InvoiceActions({ invoice, lines, linesAvailable = true, compact = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [duplicateId, setDuplicateId] = useState(null);
  const [status, setStatus] = useState(invoiceStatus(invoice));
  const invoiceLabel = invoice.display_id || invoice.display_id_number || invoice.id;
  const endpoint = `${browserApiBaseUrl}/invoices/${invoice.id}`;

  async function request(url, options) {
    const response = await fetch(url, { ...options, credentials: 'include' });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
    return body;
  }

  async function changeStatus(status) {
    setBusy(status);
    setError('');
    try {
      await request(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status === 'paid'
          ? { status, paiddate: new Date().toISOString().slice(0, 10) }
          : { status })
      });
      setStatus(status);
      if (status === 'sent') await request(`${endpoint}/email`, { method: 'POST' });
      toast.success(status === 'sent' ? `Invoice ${invoiceLabel} sent` : `Invoice ${invoiceLabel} marked as paid`);
      router.refresh();
    } catch (cause) {
      setError(cause.message || 'Could not reach the API. Check your connection and try again.');
    } finally {
      setBusy('');
    }
  }

  async function duplicate() {
    setBusy('duplicate');
    setError('');
    try {
      const sourceLines = lines ?? await request(`${endpoint}/lines`);
      const copy = await request(`${browserApiBaseUrl}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: invoice.client_id,
          date: new Date().toISOString().slice(0, 10),
          cost: invoice.cost ?? invoice.total,
          currency: invoice.currency,
          paymenttype: invoice.paymenttype,
          description: invoice.description,
          status: 'draft'
        })
      });
      setDuplicateId(copy.id);
      await request(`${browserApiBaseUrl}/invoices/${copy.id}/lines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceLines.map((line) => ({
          description: line.description,
          hours: line.hours,
          rate: line.rate,
          total: line.total ?? line.amount,
          hourly: line.hourly,
          discount: line.discount
        })))
      });
      toast.success(`Invoice ${invoiceLabel} duplicated`);
      router.push(`/invoices/${copy.id}/edit`);
      router.refresh();
    } catch (cause) {
      setError(cause.message || 'Could not reach the API. Check your connection and try again.');
    } finally {
      setBusy('');
    }
  }

  if (compact) return <div className="invoice-row-actions">
    {status === 'draft' && <Button size="icon" title="Send invoice" aria-label={`Send invoice ${invoiceLabel}`} aria-busy={busy === 'sent'} variant="ghost" disabled={Boolean(busy)} onClick={() => changeStatus('sent')}>{busy === 'sent' ? <Spinner /> : <Mail size={17} aria-hidden="true" />}</Button>}
    {status !== 'paid' && !invoice.paid && <Button size="icon" title="Mark as paid" aria-label={`Mark invoice ${invoiceLabel} as paid`} aria-busy={busy === 'paid'} variant="ghost" disabled={Boolean(busy)} onClick={() => changeStatus('paid')}>{busy === 'paid' ? <Spinner /> : <CircleCheck size={17} aria-hidden="true" />}</Button>}
    <Button size="icon" title="Duplicate invoice" aria-label={`Duplicate invoice ${invoiceLabel}`} aria-busy={busy === 'duplicate'} variant="ghost" disabled={Boolean(busy) || duplicateId !== null} onClick={duplicate}>{busy === 'duplicate' ? <Spinner /> : <Copy size={17} aria-hidden="true" />}</Button>
    {error && <span className="action-error" role="alert">{error}{duplicateId !== null && <> <Link href={`/invoices/${duplicateId}/edit`}>Open new draft</Link></>}</span>}
  </div>;

  return <>
    <StatusBadge status={status} />
    <ButtonGroup aria-label="Invoice actions">
      {status === 'draft' && <Button aria-busy={busy === 'sent'} type="button" disabled={Boolean(busy)} onClick={() => changeStatus('sent')}>{busy === 'sent' ? <Spinner /> : <Mail className="size-4" aria-hidden="true" />}{busy === 'sent' ? 'Sending...' : 'Send'}</Button>}
      {status !== 'paid' && !invoice.paid && <Button aria-busy={busy === 'paid'} variant="outline" type="button" disabled={Boolean(busy)} onClick={() => changeStatus('paid')}>{busy === 'paid' ? <Spinner /> : <CircleCheck className="size-4" aria-hidden="true" />}{busy === 'paid' ? 'Updating...' : 'Mark as paid'}</Button>}
      <Button aria-busy={busy === 'duplicate'} variant="outline" type="button" disabled={Boolean(busy) || !linesAvailable || duplicateId !== null} onClick={duplicate}>{busy === 'duplicate' ? <Spinner /> : <Copy className="size-4" aria-hidden="true" />}{busy === 'duplicate' ? 'Duplicating...' : 'Duplicate'}</Button>
    </ButtonGroup>
    {error && <span className="action-error" role="alert">{error}{duplicateId !== null && <> <Link href={`/invoices/${duplicateId}/edit`}>Open new draft</Link></>}</span>}
  </>;
}
