'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { browserApiBaseUrl, formatDateTime } from '../lib/api.js';
import { Button } from './ui/button.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Spinner } from './ui/spinner.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';

export default function InvoiceEmailPanel({ invoiceId, initialSends = [], historyError = '' }) {
  const router = useRouter();
  const [sends, setSends] = useState(initialSends);
  const [error, setError] = useState(historyError);
  const [sending, setSending] = useState(false);

  async function sendEmail() {
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${browserApiBaseUrl}/invoices/${invoiceId}/email`, { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || `Could not send invoice email (${response.status})`);
        setSending(false);
        return;
      }
      if (body?.email_send) setSends((current) => [body.email_send, ...current]);
      toast.success('Invoice email sent.');
      setSending(false);
      router.refresh();
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setSending(false);
    }
  }

  return (
    <section className="detail-section invoice-email-panel">
      <div className="section-heading">
        <h2>Email history</h2>
        <Button variant="outline" type="button" disabled={sending} aria-busy={sending} onClick={sendEmail}>
          {sending ? <Spinner /> : <Mail className="size-4" aria-hidden="true" />}
          {sending ? 'Sending...' : sends.length ? 'Resend invoice email' : 'Send invoice email'}
        </Button>
      </div>
      {error && <Alert className="mt-2" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {sends.length ? (
        <div className="table-wrap">
          <Table className="data-table" aria-label="Invoice email history">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="date-cell">Sent</TableHead>
                <TableHead scope="col">Recipient</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sends.map((send, index) => (
                <TableRow key={send.id ?? `${send.sent_at}-${index}`}>
                  <TableCell className="date-cell"><time dateTime={send.sent_at}>{formatDateTime(send.sent_at)}</time></TableCell>
                  <TableCell className="break-all">{send.recipient}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !error ? <p className="section-note">No invoice emails sent.</p> : null}
    </section>
  );
}
