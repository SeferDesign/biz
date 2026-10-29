'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Brand from './Brand.js';
import { companyInfo } from '@seferbiz/company';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Card, CardContent, CardHeader } from './ui/card.js';

async function submitJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || `Request failed (${response.status})`);
  return result;
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const email = new FormData(event.currentTarget).get('email');
    try {
      const result = await submitJson('/api/v1/auth/password-reset', { email });
      setMessage(result.message);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel title="Forgot your password">
      <p className="auth-description">Enter the email address on your account. If it matches, we’ll send a reset link.</p>
      <form className="login-form" onSubmit={submit}>
        <label className="form-field">
          <span className="form-label">Email</span>
          <Input name="email" type="email" autoComplete="email" autoFocus required />
        </label>
        {message && <p className="security-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button className="login-submit" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</Button>
        <Link className="auth-inline-link" href="/login">Back to sign in</Link>
      </form>
    </AuthPanel>
  );
}

export function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const password = form.get('password');
    if (password !== form.get('password_confirmation')) {
      setError('The passwords do not match.');
      setBusy(false);
      return;
    }
    try {
      const result = await submitJson('/api/v1/auth/password-reset/confirm', { token, password });
      setMessage(result.message);
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel title="Choose a new password">
      <form className="login-form" onSubmit={submit}>
        <label className="form-field">
          <span className="form-label">New password</span>
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="form-field">
          <span className="form-label">Confirm new password</span>
          <Input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        {message && <p className="security-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button className="login-submit" type="submit" disabled={busy || !token}>{busy ? 'Updating...' : 'Update password'}</Button>
        {!token && <p className="form-error" role="alert">This reset link is missing its token. Request a new link.</p>}
      </form>
    </AuthPanel>
  );
}

function AuthPanel({ title, children }) {
  return (
    <main className="login-page">
      <Brand/>
      <Card className="w-full max-w-[420px] p-8" aria-labelledby="auth-title">
        <CardHeader className="p-0 pb-6">
          <h1 id="auth-title" className="auth-card-title">{title}</h1>
        </CardHeader>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
      <p className="login-foot">{companyInfo.legalEntity}</p>
    </main>
  );
}
