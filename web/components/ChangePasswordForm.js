'use client';

import { useState } from 'react';

export default function ChangePasswordForm() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(formElement);
    const currentPassword = form.get('current_password');
    const newPassword = form.get('new_password');
    if (newPassword !== form.get('new_password_confirmation')) {
      setError('The new passwords do not match.');
      setBusy(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not update password.');
      formElement.reset();
      setMessage(result.message);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="editor-section">
      <div className="page-heading">
        <div><h1>Change password</h1><p className="page-description">Verify your current password before setting a new one.</p></div>
      </div>
      <form className="record-form password-change-form" onSubmit={submit}>
        <label className="form-field form-field-wide">
          <span className="form-label">Current password</span>
          <input name="current_password" type="password" autoComplete="current-password" required />
        </label>
        <label className="form-field">
          <span className="form-label">New password</span>
          <input name="new_password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="form-field">
          <span className="form-label">Confirm new password</span>
          <input name="new_password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="security-message" role="status">{message}</p>}
        <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button></div>
      </form>
    </section>
  );
}
