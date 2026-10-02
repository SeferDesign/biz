'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Copy, Mail } from 'lucide-react';
import { browserApiBaseUrl, invoiceStatus } from '../lib/api.js';
import { StatusLabel } from './ResourcePage.js';

export default function InvoiceActions({ invoice, lines, linesAvailable = true, compact = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [duplicateId, setDuplicateId] = useState(null);
  const [status, setStatus] = useState(invoiceStatus(invoice));
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
      router.push(`/invoices/${copy.id}/edit`);
      router.refresh();
    } catch (cause) {
      setError(cause.message || 'Could not reach the API. Check your connection and try again.');
    } finally {
      setBusy('');
    }
  }

  if (compact) return <div className="invoice-row-actions">
    {status === 'draft' && <button type="button" title="Send invoice" aria-label={`Send invoice ${invoice.id}`} disabled={Boolean(busy)} onClick={() => changeStatus('sent')}><Mail size={17} aria-hidden="true" /></button>}
    {status !== 'paid' && !invoice.paid && <button type="button" title="Mark as paid" aria-label={`Mark invoice ${invoice.id} as paid`} disabled={Boolean(busy)} onClick={() => changeStatus('paid')}><CircleCheck size={17} aria-hidden="true" /></button>}
    <button type="button" title="Duplicate invoice" aria-label={`Duplicate invoice ${invoice.id}`} disabled={Boolean(busy) || duplicateId !== null} onClick={duplicate}><Copy size={17} aria-hidden="true" /></button>
    {error && <span className="action-error" role="alert">{error}{duplicateId !== null && <> <Link href={`/invoices/${duplicateId}/edit`}>Open new draft</Link></>}</span>}
  </div>;

  return <>
    <StatusLabel status={status} />
    {status === 'draft' && <button className="primary-button" type="button" disabled={Boolean(busy)} onClick={() => changeStatus('sent')}>{busy === 'sent' ? 'Sending...' : 'Send'}</button>}
    {status !== 'paid' && !invoice.paid && <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => changeStatus('paid')}>{busy === 'paid' ? 'Updating...' : 'Mark as paid'}</button>}
    <button className="secondary-button" type="button" disabled={Boolean(busy) || !linesAvailable || duplicateId !== null} onClick={duplicate}>{busy === 'duplicate' ? 'Duplicating...' : 'Duplicate'}</button>
    {error && <span className="action-error" role="alert">{error}{duplicateId !== null && <> <Link href={`/invoices/${duplicateId}/edit`}>Open new draft</Link></>}</span>}
  </>;
}
