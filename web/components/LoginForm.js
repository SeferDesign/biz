'use client';

import { useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound } from 'lucide-react';
import Brand from './Brand.js';
import { companyInfo } from '@seferbiz/company';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Card } from './ui/card.js';

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
      const response = await fetch(`${browserApiBaseUrl}/auth/login`, {
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

  async function signInWithPasskey() {
    setError('');
    setSubmitting(true);
    try {
      const optionsResponse = await fetch(`${browserApiBaseUrl}/auth/passkeys/authentication/options`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const optionsResult = await optionsResponse.json().catch(() => null);
      if (!optionsResponse.ok) throw new Error(optionsResult?.error || 'Passkey sign-in is unavailable.');
      const credential = await startAuthentication({ optionsJSON: optionsResult.publicKey });
      const response = await fetch(`${browserApiBaseUrl}/auth/passkeys/authentication/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: optionsResult.challenge_id, credential })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Passkey sign-in failed. Try again.');
      router.replace(returnTo);
      router.refresh();
    } catch (cause) {
      setError(cause.message || 'Passkey sign-in was cancelled or failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <Brand/>
      <Card className="w-full max-w-[420px] p-8">
        <form className="login-form" onSubmit={submit}>
          <label className="form-field">
            <span className="form-label">Email</span>
            <Input name="email" type="email" autoComplete="username" autoFocus required />
          </label>
          <label className="form-field">
            <span className="form-label">Password</span>
            <Input name="password" type="password" autoComplete="current-password" required />
          </label>
          <label className="form-field">
            <span className="form-label">Two-factor code</span>
            <Input name="otp_attempt" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={12} />
          </label>
          <Link className="auth-inline-link" href="/forgot-password">Forgot your password?</Link>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button className="login-submit" disabled={submitting} type="submit">
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
          <div className="auth-divider" aria-hidden="true"><span>or</span></div>
          <Button className="login-submit passkey-submit" variant="outline" disabled={submitting} onClick={signInWithPasskey} type="button">
            <KeyRound aria-hidden="true" size={16} />
            {submitting ? 'Waiting for passkey...' : 'Sign in with a passkey'}
          </Button>
        </form>
      </Card>
      <p className="login-foot">{companyInfo.legalEntity}</p>
    </main>
  );
}
