'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({ endpoint, returnTo, label = 'Delete record' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete this ${label.toLowerCase().replace('delete ', '')}? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || `Could not delete record (${response.status})`);
        setDeleting(false);
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setDeleting(false);
    }
  }

  return (
    <div className="delete-action">
      <button className="danger-button" type="button" disabled={deleting} onClick={remove}>{deleting ? 'Deleting...' : label}</button>
      {error && <span className="action-error" role="alert">{error}</span>}
    </div>
  );
}
