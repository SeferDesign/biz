'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { browserApiBaseUrl } from '../lib/api.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Spinner } from './ui/spinner.js';

export default function ClientPortalLinkPanel({ clientId, initialAccessToken }) {
  const [accessToken, setAccessToken] = useState(initialAccessToken || '');
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const link = accessToken && origin ? `${origin}/clients/${clientId}?access_token=${encodeURIComponent(accessToken)}` : '';

  useEffect(() => setOrigin(window.location.origin), []);

  async function createLink() {
    setStatus('creating');
    setError('');
    try {
      const response = await fetch(`${browserApiBaseUrl}/clients/${clientId}/access-token`, { method: 'POST', credentials: 'include' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.access_token) throw new Error(body?.error || `Could not create link (${response.status})`);
      setAccessToken(body.access_token);
      setStatus('');
      toast.success('Client portal link created.');
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
      <div className="section-heading"><h2>Client portal link</h2><span className="section-note">Anyone with this link can view this client’s invoices and balances</span></div>
      {accessToken ? (
        <div className="copy-field">
          <Input aria-label="Client portal link" readOnly value={link} onFocus={(event) => event.target.select()} />
          <Button variant="outline" type="button" disabled={!link} onClick={copyLink}><Copy className="size-4" aria-hidden="true" />{status === 'copied' ? 'Copied' : 'Copy link'}</Button>
        </div>
      ) : (
        <Button variant="outline" type="button" disabled={status === 'creating'} onClick={createLink}>
          {status === 'creating' ? <Spinner /> : <Link2 className="size-4" aria-hidden="true" />}
          {status === 'creating' ? 'Creating...' : 'Create client link'}
        </Button>
      )}
      {error && <Alert className="mt-2" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </section>
  );
}
