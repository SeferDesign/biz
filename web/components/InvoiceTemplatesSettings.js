'use client';

import { useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty.js';

async function requestJson(path, options) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export default function InvoiceTemplatesSettings({ initialTemplates, clients }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function createTemplate(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const created = await requestJson(`${browserApiBaseUrl}/invoice-templates`, {
        method: 'POST',
        body: JSON.stringify({ name, description, client_id: clientId ? Number(clientId) : null })
      });
      setTemplates((previous) => [...previous, created].sort((left, right) => Number(left.client_id != null) - Number(right.client_id != null) || left.name.localeCompare(right.name)));
      setName('');
      setDescription('');
      setMessage('Template created.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateTemplate(id, updates) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await requestJson(`${browserApiBaseUrl}/invoice-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      setTemplates((previous) => previous.map((item) => item.id === id ? updated : item));
      setMessage('Template saved.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await requestJson(`${browserApiBaseUrl}/invoice-templates/${id}`, { method: 'DELETE' });
      setTemplates((previous) => previous.filter((item) => item.id !== id));
      setMessage('Template deleted.');
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
          <h1>Invoice Templates</h1>
          <p className="page-description">Save reusable descriptions for every client or a specific client.</p>
        </div>
      </div>
      <form className="record-form password-change-form" onSubmit={createTemplate}>
        <label className="form-field">
          <span className="form-label">Name</span>
          <Input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="form-field">
          <span className="form-label">Use for</span>
          <select className="invoice-template-select" value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">All clients</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>
        <label className="form-field form-field-wide">
          <span className="form-label">Description</span>
          <Textarea rows={4} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} required />
        </label>
        <div className="form-actions">
          <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create template'}</Button>
        </div>
      </form>
      {templates.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No invoice templates yet</EmptyTitle>
            <EmptyDescription>Create one above to insert it while editing an invoice.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="table-wrap">
          <Table className="data-table">
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Use for</TableHead><TableHead>Description</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TemplateRow
                  busy={busy}
                  clients={clients}
                  key={template.id}
                  template={template}
                  onDelete={deleteTemplate}
                  onSave={updateTemplate}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="security-message" role="status">{message}</p>}
    </section>
  );
}

function TemplateRow({ template, clients, onSave, onDelete, busy }) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [clientId, setClientId] = useState(template.client_id == null ? '' : String(template.client_id));

  return (
    <TableRow>
      <TableCell className="primary-cell"><Input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} aria-label={`Name for ${template.name}`} /></TableCell>
      <TableCell>
        <select className="invoice-template-select" value={clientId} onChange={(event) => setClientId(event.target.value)} aria-label={`Client scope for ${template.name}`}>
          <option value="">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </TableCell>
      <TableCell><Textarea rows={2} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} aria-label={`Description for ${template.name}`} /></TableCell>
      <TableCell>
        <div className="resource-actions">
          <Button size="sm" type="button" disabled={busy} onClick={() => onSave(template.id, { name, description, client_id: clientId ? Number(clientId) : null })}>Save</Button>
          <Button size="sm" variant="destructive" type="button" disabled={busy} onClick={() => onDelete(template.id)}>Delete</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}