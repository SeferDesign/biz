'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initialValue(field, initialValues) {
  const value = initialValues[field.name] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
  return field.multiplier && value !== '' ? Number(value) * field.multiplier : value;
}

export default function RecordForm({ title, description, fields, initialValues = {}, endpoint, method = 'POST', returnTo, submitLabel }) {
  const router = useRouter();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, initialValue(field, initialValues)])));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function getPayload() {
    return Object.fromEntries(fields.map((field) => {
      const value = values[field.name];
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
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload())
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || `Could not save record (${response.status})`);
        setSaving(false);
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setSaving(false);
    }
  }

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
                value={values[field.name]}
                onChange={(event) => setField(field.name, event.target.value)}
              />
            )}
            {field.helpText && field.type !== 'checkbox' && <span className="form-help">{field.helpText}</span>}
          </label>
        ))}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving...' : submitLabel || 'Save record'}</button>
          <Link className="secondary-button" href={returnTo}>Cancel</Link>
        </div>
      </form>
    </section>
  );
}
