'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initialValue(field, initialValues) {
  const value = initialValues[field.name] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
  return field.multiplier && value !== '' ? Number(value) * field.multiplier : value;
}

export default function RecordForm({ title, description, fields, initialValues = {}, endpoint, method = 'POST', returnTo, submitLabel, lineItemsEnabled = false, initialLines = [], lineItemsEndpoint, emailEndpoint }) {
  const router = useRouter();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, initialValue(field, initialValues)])));
  const [lineItems, setLineItems] = useState(() => initialLines.map((line) => ({
    description: line.description || '',
    hours: line.hours ?? '',
    rate: line.rate ?? '',
    total: line.total ?? line.amount ?? ''
  })));
  const [saveEndpoint, setSaveEndpoint] = useState(endpoint);
  const [saveMethod, setSaveMethod] = useState(method);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function getLinePayload() {
    return lineItems
      .filter((line) => [line.description, line.hours, line.rate, line.total].some((value) => String(value ?? '').trim() !== ''))
      .map((line) => {
        const hours = line.hours === '' ? null : Number(line.hours);
        const rate = line.rate === '' ? null : Number(line.rate);
        return {
          description: line.description.trim() || null,
          hours,
          rate,
          total: line.total !== '' ? Number(line.total) : hours !== null && rate !== null ? hours * rate : 0
        };
      });
  }

  function getPayload(lines) {
    return Object.fromEntries(fields.map((field) => {
      const value = values[field.name];
      if (lineItemsEnabled && field.name === 'cost' && lines.length) {
        return [field.name, lines.reduce((total, line) => total + line.total, 0)];
      }
      if (field.type === 'checkbox') return [field.name, Boolean(value)];
      if (field.type === 'months') return [field.name, value.map(Number)];
      if (field.type === 'number') return [field.name, value === '' ? null : Number(value) / (field.multiplier || 1)];
      if (field.type === 'relation') return [field.name, value === '' ? null : Number(value)];
      if (field.type === 'date') return [field.name, value || null];
      return [field.name, value];
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const lines = lineItemsEnabled ? getLinePayload() : [];
      const response = await fetch(saveEndpoint, {
        method: saveMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload(lines))
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || `Could not save record (${response.status})`);
        setSaving(false);
        return;
      }
      const invoiceId = body?.id ?? initialValues.id;
      if (lineItemsEnabled) {
        if (saveMethod === 'POST' && invoiceId) {
          setSaveEndpoint(`${endpoint}/${invoiceId}`);
          setSaveMethod('PATCH');
        }
        const linesResponse = await fetch(lineItemsEndpoint.replace(':id', encodeURIComponent(invoiceId)), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lines)
        });
        const linesBody = await linesResponse.json().catch(() => null);
        if (!linesResponse.ok) {
          setError(linesBody?.error || 'Invoice saved, but its line items could not be saved. Try again.');
          setSaving(false);
          return;
        }
      }
      if (emailEndpoint && values.status === 'sent' && initialValues.status !== 'sent') {
        let emailResponse;
        try {
          emailResponse = await fetch(emailEndpoint.replace(':id', encodeURIComponent(invoiceId)), { method: 'POST' });
        } catch {
          setError('Invoice saved, but email delivery could not be reached. Try saving again.');
          setSaving(false);
          return;
        }
        const emailBody = await emailResponse.json().catch(() => null);
        if (!emailResponse.ok) {
          setError(emailBody?.error || 'Invoice saved, but the email could not be sent. Try saving again.');
          setSaving(false);
          return;
        }
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setSaving(false);
    }
  }

  const linePayload = lineItemsEnabled ? getLinePayload() : [];
  const lineItemsTotal = linePayload.reduce((total, line) => total + line.total, 0);
  const selectedClientRate = fields
    .find((field) => field.name === 'client_id')?.options
    ?.find((option) => String(option.value) === String(values.client_id))?.rate;

  return (
    <section className="editor-section">
      <div className="page-heading">
        <div><p className="eyebrow">RECORD EDITOR</p><h1>{title}</h1><p className="page-description">{description}</p></div>
      </div>
      <form className="record-form" onSubmit={submit}>
        {fields.map((field) => (
          <label className={`form-field${field.wide ? ' form-field-wide' : ''}`} key={field.name}>
            <span className="form-label">{field.label}{field.required && <span className="required-mark"> *</span>}</span>
            {field.type === 'textarea' ? (
              <textarea name={field.name} rows={field.rows || 3} value={values[field.name]} required={field.required} onChange={(event) => setField(field.name, event.target.value)} />
            ) : field.type === 'select' || field.type === 'relation' ? (
              <select name={field.name} value={values[field.name]} required={field.required} onChange={(event) => setField(field.name, event.target.value)}>
                {!field.required && <option value="">None</option>}
                {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : field.type === 'months' ? (
              <div className="month-goal-grid">
                {monthNames.map((month, index) => (
                  <span className="month-goal-field" key={month}>
                    <span>{month.slice(0, 3)}</span>
                    <input
                      aria-label={`${month} goal`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={values[field.name]?.[index] ?? 0}
                      onChange={(event) => {
                        const goals = [...values[field.name]];
                        goals[index] = event.target.value;
                        setField(field.name, goals);
                      }}
                    />
                  </span>
                ))}
              </div>
            ) : field.type === 'checkbox' ? (
              <span className="checkbox-control"><input name={field.name} type="checkbox" checked={Boolean(values[field.name])} onChange={(event) => setField(field.name, event.target.checked)} /><span>{field.helpText || 'Enabled'}</span></span>
            ) : (
              <input
                name={field.name}
                type={field.type || 'text'}
                min={field.min}
                max={field.max}
                step={field.step}
                required={field.required}
                value={lineItemsEnabled && field.name === 'cost' && linePayload.length ? lineItemsTotal : values[field.name]}
                readOnly={lineItemsEnabled && field.name === 'cost' && linePayload.length > 0}
                onChange={(event) => setField(field.name, event.target.value)}
              />
            )}
            {field.helpText && field.type !== 'checkbox' && <span className="form-help">{field.helpText}</span>}
          </label>
        ))}
        {lineItemsEnabled && (
          <section className="invoice-line-editor form-field-wide" aria-labelledby="invoice-lines-heading">
            <div className="invoice-line-heading">
              <h2 id="invoice-lines-heading">Line items</h2>
              <span>{linePayload.length} items · Total {lineItemsTotal.toFixed(2)}</span>
            </div>
            {lineItems.map((line, index) => (
              <div className="invoice-line-row" key={index}>
                <label><span>Description</span><input value={line.description} onChange={(event) => setLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} /></label>
                <label><span>Hours</span><input type="number" min="0" step="0.01" value={line.hours} onChange={(event) => setLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, hours: event.target.value } : item))} /></label>
                <label><span>Rate</span><input type="number" min="0" step="0.01" placeholder={selectedClientRate == null ? '' : String(selectedClientRate)} value={line.rate} onChange={(event) => setLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, rate: event.target.value } : item))} /></label>
                <label><span>Amount</span><input type="number" min="0" step="0.01" value={line.total === '' && line.hours !== '' && line.rate !== '' ? Number(line.hours) * Number(line.rate) : line.total} onChange={(event) => setLineItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, total: event.target.value } : item))} /></label>
                <button className="secondary-button invoice-line-remove" type="button" aria-label={`Remove line item ${index + 1}`} onClick={() => setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
              </div>
            ))}
            <button className="secondary-button invoice-line-add" type="button" onClick={() => setLineItems((current) => [...current, { description: '', hours: '', rate: '', total: '' }])}>+ Add line item</button>
          </section>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving...' : submitLabel || 'Save record'}</button>
          <Link className="secondary-button" href={returnTo}>Cancel</Link>
        </div>
      </form>
    </section>
  );
}
