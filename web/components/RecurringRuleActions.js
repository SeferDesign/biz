'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { browserApiBaseUrl } from '../lib/api.js';
import { Button } from './ui/button.js';

export default function RecurringRuleActions({ id, active }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nextActive = !active;
  const label = nextActive ? 'Resume recurring expense' : 'Pause recurring expense';

  async function toggleActive() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${browserApiBaseUrl}/recurring-expenses/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
      router.refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={toggleActive} aria-label={label}>
        {busy ? 'Saving...' : <>{active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{active ? 'Pause' : 'Resume'}</>}
      </Button>
      {error && <span className="text-xs text-destructive" role="alert">{error}</span>}
    </span>
  );
}
