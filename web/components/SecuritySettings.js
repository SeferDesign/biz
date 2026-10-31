'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { browserApiBaseUrl } from '../lib/api.js';
import { startRegistration } from '@simplewebauthn/browser';
import { KeyRound, Trash2 } from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Badge } from './ui/badge.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Spinner } from './ui/spinner.js';

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
  const [busy, setBusy] = useState('');

  async function startSetup() {
    setBusy('setup');
    setError('');
    try {
      setSetup(await postJson(`${browserApiBaseUrl}/auth/otp/setup`));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy('');
    }
  }

  async function enable(event) {
    event.preventDefault();
    setBusy('enable');
    setError('');
    try {
      setSettings(await postJson(`${browserApiBaseUrl}/auth/otp/enable`, { otp_attempt: code }));
      setSetup(null);
      setCode('');
      toast.success('Two-factor authentication is enabled.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy('');
    }
  }

  async function disable(event) {
    event.preventDefault();
    setBusy('disable');
    setError('');
    try {
      setSettings(await postJson(`${browserApiBaseUrl}/auth/otp/disable`, { otp_attempt: code }));
      setCode('');
      setSetup(null);
      toast.success('Two-factor authentication is disabled.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy('');
    }
  }

  async function addPasskey() {
    setBusy('passkey');
    setError('');
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
      toast.success('Passkey added.');
    } catch (cause) {
      setError(cause.message || 'Passkey setup was cancelled or failed. Try again.');
    } finally {
      setBusy('');
    }
  }

  async function removePasskey(id) {
    setBusy(`remove:${id}`);
    setError('');
    try {
      await deleteRequest(`${browserApiBaseUrl}/auth/passkeys/${id}`);
      setSettings((current) => ({ ...current, passkeys: current.passkeys.filter((passkey) => passkey.id !== id) }));
      toast.success('Passkey removed.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="grid w-full max-w-4xl gap-5">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="grid gap-1">
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>Require an authenticator code whenever this account signs in.</CardDescription>
          </div>
          <Badge className="shrink-0" variant={settings.otp_enabled ? 'default' : 'secondary'}>
            {settings.otp_enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1 border-t pt-4">
            <h3 className="text-sm font-medium">{settings.otp_enabled ? 'Authenticator required' : 'Password sign-in'}</h3>
            <p className="text-sm text-muted-foreground">{settings.otp_enabled
              ? 'A valid code is required in addition to your password.'
              : 'Two-factor authentication is off for this account.'}</p>
          </div>

          {!settings.otp_enabled && !setup && (
            <div>
              <Button aria-busy={busy === 'setup'} type="button" disabled={Boolean(busy)} onClick={startSetup}>
                {busy === 'setup' && <Spinner />}
                {busy === 'setup' ? 'Preparing...' : settings.otp_configured ? 'Replace authenticator setup' : 'Set up authenticator'}
              </Button>
            </div>
          )}

          {setup && (
            <div className="grid gap-4 border-t pt-4">
              <div className="grid gap-1">
                <h3 className="text-sm font-medium">Connect an authenticator</h3>
                <p className="text-sm text-muted-foreground">Enter this key in your authenticator app. The key is shown only during setup.</p>
              </div>
              <code className="block w-fit max-w-full break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm">{setup.secret}</code>
              <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={enable}>
                <label className="form-field min-w-0">
                  <span className="form-label">Current authenticator code</span>
                  <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required />
                </label>
                <Button aria-busy={busy === 'enable'} type="submit" disabled={Boolean(busy)}>{busy === 'enable' && <Spinner />}{busy === 'enable' ? 'Verifying...' : 'Verify and enable'}</Button>
              </form>
            </div>
          )}

          {settings.otp_enabled && (
            <form className="grid gap-3 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={disable}>
              <label className="form-field min-w-0">
                <span className="form-label">Current authenticator code</span>
                <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required />
              </label>
              <Button aria-busy={busy === 'disable'} variant="destructive" type="submit" disabled={Boolean(busy)}>{busy === 'disable' && <Spinner />}{busy === 'disable' ? 'Verifying...' : 'Disable two-factor authentication'}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>Sign in securely with a device or security key, without entering your password.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="form-field min-w-0">
              <span className="form-label">Passkey name</span>
              <Input value={passkeyName} onChange={(event) => setPasskeyName(event.target.value)} maxLength={255} placeholder="e.g. MacBook" />
            </label>
            <Button aria-busy={busy === 'passkey'} type="button" disabled={Boolean(busy)} onClick={addPasskey}>
              {busy === 'passkey' ? <Spinner /> : <KeyRound aria-hidden="true" size={16} />}
              {busy === 'passkey' ? 'Adding passkey...' : 'Add passkey'}
            </Button>
          </div>
          {settings.passkeys.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {settings.passkeys.map((passkey) => (
                <li className="flex items-center justify-between gap-3 px-3 py-2" key={passkey.id}>
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <KeyRound aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{passkey.name}</span>
                  </span>
                  <Button
                    aria-label={`Remove ${passkey.name}`}
                    title={`Remove ${passkey.name}`}
                    variant="outline"
                    size="icon"
                    type="button"
                    disabled={Boolean(busy)}
                    aria-busy={busy === `remove:${passkey.id}`}
                    onClick={() => removePasskey(passkey.id)}
                  >
                    {busy === `remove:${passkey.id}` ? <Spinner /> : <Trash2 aria-hidden="true" size={16} />}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">No passkeys registered.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
