'use client';

import { useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
import { startRegistration } from '@simplewebauthn/browser';
import { KeyRound, Trash2 } from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Badge } from './ui/badge.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Empty, EmptyHeader, EmptyTitle } from './ui/empty.js';

async function postJson(path, body = {}) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || `Request failed (${response.status})`);
  return result;
}

async function deleteRequest(path) {
  const response = await fetch(path, { method: 'DELETE', credentials: 'include' });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Request failed (${response.status})`);
  }
}

export default function SecuritySettings({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [passkeyName, setPasskeyName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setSetup(await postJson(`${browserApiBaseUrl}/auth/otp/setup`));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function enable(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setSettings(await postJson(`${browserApiBaseUrl}/auth/otp/enable`, { otp_attempt: code }));
      setSetup(null);
      setCode('');
      setMessage('Two-factor authentication is enabled.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setSettings(await postJson(`${browserApiBaseUrl}/auth/otp/disable`, { otp_attempt: code }));
      setCode('');
      setSetup(null);
      setMessage('Two-factor authentication is disabled.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function addPasskey() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const options = await postJson(`${browserApiBaseUrl}/auth/passkeys/registration/options`);
      const credential = await startRegistration({ optionsJSON: options.publicKey });
      const created = await postJson(`${browserApiBaseUrl}/auth/passkeys/registration/verify`, {
        challenge_id: options.challenge_id,
        credential,
        name: passkeyName.trim()
      });
      setSettings((current) => ({ ...current, passkeys: [...current.passkeys, created] }));
      setPasskeyName('');
      setMessage('Passkey added.');
    } catch (cause) {
      setError(cause.message || 'Passkey setup was cancelled or failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteRequest(`${browserApiBaseUrl}/auth/passkeys/${id}`);
      setSettings((current) => ({ ...current, passkeys: current.passkeys.filter((passkey) => passkey.id !== id) }));
      setMessage('Passkey removed.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="security-section">
      <div className="page-heading">
        <div>
          <h1>Two-factor authentication</h1>
          <p className="page-description">Require an authenticator code whenever this account signs in.</p>
        </div>
        <Badge variant={settings.otp_enabled ? 'default' : 'secondary'}>
          {settings.otp_enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      <div className="security-content">
        <div className="security-state">
          <span className="security-state-mark" aria-hidden="true">{settings.otp_enabled ? '02' : '01'}</span>
          <div>
            <h2>{settings.otp_enabled ? 'Authenticator required' : 'Password sign-in'}</h2>
            <p>{settings.otp_enabled
              ? 'A valid code is required in addition to your password.'
              : 'Two-factor authentication is off for this account.'}</p>
          </div>
        </div>

        {!settings.otp_enabled && !setup && (
          <Button type="button" disabled={busy} onClick={startSetup}>
            {busy ? 'Preparing...' : settings.otp_configured ? 'Replace authenticator setup' : 'Set up authenticator'}
          </Button>
        )}

        {setup && (
          <Card>
            <CardHeader>
              <CardTitle>Connect an authenticator</CardTitle>
              <CardDescription>Enter this key in your authenticator app. The key is shown only during setup.</CardDescription>
            </CardHeader>
            <CardContent className="grid justify-items-start gap-4">
              <code className="otp-secret">{setup.secret}</code>
              <form className="otp-confirm-form" onSubmit={enable}>
                <label className="form-field">
                  <span className="form-label">Current authenticator code</span>
                  <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required />
                </label>
                <Button type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Verify and enable'}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {settings.otp_enabled && (
          <form className="otp-confirm-form" onSubmit={disable}>
            <label className="form-field">
              <span className="form-label">Current authenticator code</span>
              <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required />
            </label>
            <Button variant="destructive" type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Disable two-factor authentication'}</Button>
          </form>
        )}

        <section className="passkey-settings" aria-labelledby="passkey-heading">
          <div className="passkey-heading">
            <div>
              <h2 id="passkey-heading">Passkeys</h2>
              <p>Sign in securely with a device or security key, without entering your password.</p>
            </div>
            <div className="passkey-controls">
              <label className="form-field">
                <span className="form-label">Passkey name</span>
                <Input value={passkeyName} onChange={(event) => setPasskeyName(event.target.value)} maxLength={255} placeholder="e.g. MacBook" />
              </label>
              <Button type="button" disabled={busy} onClick={addPasskey}>
                <KeyRound aria-hidden="true" size={16} />
                Add passkey
              </Button>
            </div>
          </div>
          {settings.passkeys.length > 0 ? (
            <ul className="passkey-list">
              {settings.passkeys.map((passkey) => (
                <li key={passkey.id}>
                  <span><KeyRound aria-hidden="true" size={16} />{passkey.name}</span>
                  <Button
                    aria-label={`Remove ${passkey.name}`}
                    title={`Remove ${passkey.name}`}
                    variant="outline"
                    type="button"
                    disabled={busy}
                    onClick={() => removePasskey(passkey.id)}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No passkeys registered.</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="security-message" role="status">{message}</p>}
      </div>
    </section>
  );
}
