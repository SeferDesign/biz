'use client';

import { useState } from 'react';

async function postJson(path, body = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || `Request failed (${response.status})`);
  return result;
}

export default function SecuritySettings({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setSetup(await postJson('/api/v1/auth/otp/setup'));
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
      setSettings(await postJson('/api/v1/auth/otp/enable', { otp_attempt: code }));
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
      setSettings(await postJson('/api/v1/auth/otp/disable', { otp_attempt: code }));
      setCode('');
      setSetup(null);
      setMessage('Two-factor authentication is disabled.');
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
        <span className={`status-label${settings.otp_enabled ? ' status-paid' : ''}`}>
          {settings.otp_enabled ? 'Enabled' : 'Disabled'}
        </span>
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
          <button className="primary-button" type="button" disabled={busy} onClick={startSetup}>
            {busy ? 'Preparing...' : settings.otp_configured ? 'Replace authenticator setup' : 'Set up authenticator'}
          </button>
        )}

        {setup && (
          <div className="otp-setup">
            <h2>Connect an authenticator</h2>
            <p>Enter this key in your authenticator app. The key is shown only during setup.</p>
            <code className="otp-secret">{setup.secret}</code>
            <form className="otp-confirm-form" onSubmit={enable}>
              <label className="form-field">
                <span className="form-label">Current authenticator code</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required />
              </label>
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Verify and enable'}</button>
            </form>
          </div>
        )}

        {settings.otp_enabled && (
          <form className="otp-confirm-form" onSubmit={disable}>
            <label className="form-field">
              <span className="form-label">Current authenticator code</span>
              <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" required />
            </label>
            <button className="danger-button" type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Disable two-factor authentication'}</button>
          </form>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="security-message" role="status">{message}</p>}
      </div>
    </section>
  );
}
