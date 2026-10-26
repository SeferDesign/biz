'use client';

import { useEffect, useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';

export default function ClientLinkPanel({ invoiceId, initialAccessToken }) {
  const [accessToken, setAccessToken] = useState(initialAccessToken || '');
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const link = accessToken && origin ? `${origin}/invoices/${invoiceId}?access_token=${encodeURIComponent(accessToken)}` : '';

  useEffect(() => setOrigin(window.location.origin), []);

  async function createLink() {
    setStatus('creating');
    setError('');
    try {
      const response = await fetch(`${browserApiBaseUrl}/invoices/${invoiceId}/access-token`, { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.access_token) throw new Error(body?.error || `Could not create link (${response.status})`);
      setAccessToken(body.access_token);
      setStatus('');
    } catch (createError) {
      setError(createError.message);
      setStatus('');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus('copied');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setError('Copy failed. Select the link and copy it manually.');
    }
  }

  return (
    <section className="detail-section client-link-panel">
      <div className="section-heading"><h2>Client link</h2><span className="section-note">Anyone with this link can view and pay this invoice</span></div>
      {accessToken ? (
        <div className="copy-field">
          <input aria-label="Client invoice link" readOnly value={link} onFocus={(event) => event.target.select()} />
          <button className="secondary-button" type="button" disabled={!link} onClick={copyLink}>{status === 'copied' ? 'Copied' : 'Copy link'}</button>
        </div>
      ) : (
        <button className="secondary-button" type="button" disabled={status === 'creating'} onClick={createLink}>
          {status === 'creating' ? 'Creating...' : 'Create client link'}
        </button>
      )}
      {error && <p className="action-error" role="alert">{error}</p>}
    </section>
  );
}
