'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Brand from './Brand.js';
import { companyInfo } from '@seferbiz/company';

export default function LoginForm({ returnTo }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          otp_attempt: form.get('otp_attempt')
        })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || 'Sign-in failed. Check your credentials and try again.');
        setSubmitting(false);
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError('Authentication service is unavailable. Try again shortly.');
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <Brand/>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <label className="form-field">
            <span className="form-label">Email</span>
            <input name="email" type="email" autoComplete="username" autoFocus required />
          </label>
          <label className="form-field">
            <span className="form-label">Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <label className="form-field">
            <span className="form-label">Two-factor code</span>
            <input name="otp_attempt" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12} />
          </label>
          <Link className="auth-inline-link" href="/forgot-password">Forgot your password?</Link>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" disabled={submitting} type="submit">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
      <p className="login-foot">{companyInfo.legalEntity}</p>
    </main>
  );
}
