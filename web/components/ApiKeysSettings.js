'use client';

import { useState } from 'react';

function formatDateTime(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function generateApiKeyValue() {
  const bytes = new Uint8Array(24);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  const suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `sbk_${suffix}`;
}

async function requestJson(path, options) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export default function ApiKeysSettings({ initialKeys }) {
  const [keys, setKeys] = useState(Array.isArray(initialKeys) ? initialKeys : []);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function populateGeneratedKey() {
    setNewKey(generateApiKeyValue());
    setError('');
    setMessage('Generated a new API key value. Save to create it.');
  }

  async function createKey(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const created = await requestJson('/api/v1/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ label: newLabel, key: newKey })
      });
      setKeys((previous) => [created, ...previous]);
      setNewLabel('');
      setNewKey('');
      setMessage('API key created.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateKey(id, label, key) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await requestJson(`/api/v1/auth/api-keys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ label, key })
      });
      setKeys((previous) => previous.map((entry) => (entry.id === id ? updated : entry)));
      setMessage('API key updated.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteKey(id) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/v1/auth/api-keys/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${response.status})`);
      }
      setKeys((previous) => previous.filter((entry) => entry.id !== id));
      setMessage('API key deleted.');
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
          <h1>API Keys</h1>
          <p className="page-description">Create and manage bearer keys for scripts and integrations.</p>
        </div>
      </div>

      <form className="record-form password-change-form" onSubmit={createKey}>
        <label className="form-field">
          <span className="form-label">Label</span>
          <input
            name="label"
            type="text"
            maxLength={255}
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            required
          />
        </label>
        <label className="form-field form-field-wide">
          <span className="form-label">Key</span>
          <input
            name="key"
            type="text"
            maxLength={255}
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            required
          />
        </label>
        <div className="form-actions">
          <button className="secondary-button" type="button" disabled={busy} onClick={populateGeneratedKey}>Generate key</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create key'}</button>
        </div>
      </form>

      {keys.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">--</span>
          <h2>No API keys yet</h2>
          <p>Create a key above to authorize scripts with bearer auth.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Last used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((entry) => (
                <ApiKeyRow
                  busy={busy}
                  entry={entry}
                  key={entry.id}
                  onDelete={deleteKey}
                  onSave={updateKey}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="security-message" role="status">{message}</p>}
    </section>
  );
}

function ApiKeyRow({ entry, onSave, onDelete, busy }) {
  const [label, setLabel] = useState(entry.label || '');
  const [key, setKey] = useState(entry.key || '');

  return (
    <tr>
      <td className="primary-cell">
        <input value={label} maxLength={255} onChange={(event) => setLabel(event.target.value)} aria-label={`Label for API key ${entry.id}`} />
      </td>
      <td>
        <input value={key} maxLength={255} onChange={(event) => setKey(event.target.value)} aria-label={`Key value for API key ${entry.id}`} />
      </td>
      <td>{formatDateTime(entry.last_used_at)}</td>
      <td>
        <div className="resource-actions">
          <button className="primary-button" type="button" disabled={busy} onClick={() => onSave(entry.id, label, key)}>Save</button>
          <button className="danger-button" type="button" disabled={busy} onClick={() => onDelete(entry.id)}>Delete</button>
        </div>
      </td>
    </tr>
  );
}
