'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { browserApiBaseUrl } from '../lib/api.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Input } from './ui/input.js';
import { Spinner } from './ui/spinner.js';

export default function ChangePasswordForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError('');
    const form = new FormData(formElement);
    const currentPassword = form.get('current_password');
    const newPassword = form.get('new_password');
    if (newPassword !== form.get('new_password_confirmation')) {
      setError('The new passwords do not match.');
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`${browserApiBaseUrl}/auth/password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not update password.');
      formElement.reset();
      toast.success(result.message || 'Password updated.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Verify your current password before setting a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <label className="form-field sm:col-span-2">
              <span className="form-label">Current password</span>
              <Input name="current_password" type="password" autoComplete="current-password" required />
            </label>
            <label className="form-field">
              <span className="form-label">New password</span>
              <Input name="new_password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="form-field">
              <span className="form-label">Confirm new password</span>
              <Input name="new_password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            {error && <Alert className="sm:col-span-2" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="sm:col-span-2">
              <Button aria-busy={busy} type="submit" disabled={busy}>{busy && <Spinner />}{busy ? 'Updating...' : 'Update password'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
