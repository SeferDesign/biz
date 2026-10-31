'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { browserApiBaseUrl } from '../lib/api.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Spinner } from './ui/spinner.js';

export default function AccountProfileForm({ initialUser }) {
  const [firstName, setFirstName] = useState(initialUser?.first_name || '');
  const [lastName, setLastName] = useState(initialUser?.last_name || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch(`${browserApiBaseUrl}/auth/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName
        })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not update profile.');

      setFirstName(result.user?.first_name || '');
      setLastName(result.user?.last_name || '');
      toast.success(result.message || 'Profile updated.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="editor-section">
      <div className="page-heading">
        <div>
          <h1>Profile</h1>
          <p className="page-description">Update your name for this account.</p>
        </div>
      </div>
      <form className="record-form password-change-form" onSubmit={submit}>
        <label className="form-field">
          <span className="form-label">First name</span>
          <Input
            name="first_name"
            type="text"
            autoComplete="given-name"
            maxLength={255}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>
        <label className="form-field">
          <span className="form-label">Last name</span>
          <Input
            name="last_name"
            type="text"
            autoComplete="family-name"
            maxLength={255}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>
        {error && <Alert className="form-field-wide" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="form-actions">
          <Button aria-busy={busy} type="submit" disabled={busy}>{busy ? <Spinner /> : <Save className="size-4" aria-hidden="true" />}{busy ? 'Saving...' : 'Save profile'}</Button>
        </div>
      </form>
    </section>
  );
}
