'use client';

import { useState } from 'react';
import { browserApiBaseUrl, formatDateTime } from '../lib/api.js';

export default function InvoiceEmailPanel({ invoiceId, initialSends = [], historyError = '' }) {
  const [sends, setSends] = useState(initialSends);
  const [error, setError] = useState(historyError);
  const [sending, setSending] = useState(false);

  async function sendEmail() {
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${browserApiBaseUrl}/invoices/${invoiceId}/email`, { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || `Could not send invoice email (${response.status})`);
        setSending(false);
        return;
      }
      if (body?.email_send) setSends((current) => [body.email_send, ...current]);
      setSending(false);
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setSending(false);
    }
  }

  return (
    <section className="detail-section invoice-email-panel">
      <div className="section-heading">
        <h2>Email history</h2>
        <button className="secondary-button" type="button" disabled={sending} aria-busy={sending} onClick={sendEmail}>
          {sending ? 'Sending...' : sends.length ? 'Resend invoice email' : 'Send invoice email'}
        </button>
      </div>
      {error && <p className="action-error" role="alert">{error}</p>}
      {sends.length ? (
        <ul className="invoice-email-history">
          {sends.map((send, index) => (
            <li key={send.id ?? `${send.sent_at}-${index}`}>
              <time dateTime={send.sent_at}>{formatDateTime(send.sent_at)}</time>
              <span>Sent to {send.recipient}</span>
            </li>
          ))}
        </ul>
      ) : !error ? <p className="section-note">No invoice emails sent.</p> : null}
    </section>
  );
}