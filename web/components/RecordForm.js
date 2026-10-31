'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Combobox } from './ui/combobox.js';
import { DatePicker } from './ui/date-picker.js';
import { browserApiBaseUrl } from '../lib/api.js';
import { expandInvoiceTemplate } from '../lib/invoice-template.js';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './ui/alert.js';
import { Skeleton } from './ui/skeleton.js';
import { Spinner } from './ui/spinner.js';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initialValue(field, initialValues) {
  const value = initialValues[field.name] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
  return field.multiplier && value !== '' ? Number(value) * field.multiplier : value;
}

export default function RecordForm({ title, description, fields, initialValues = {}, endpoint, method = 'POST', returnTo, createdRecordHref, submitLabel, lineItemsEnabled = false, initialLines = [], lineItemsEndpoint, emailEndpoint }) {
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
  const [invoiceTemplates, setInvoiceTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const descriptionRef = useRef(null);

  useEffect(() => {
    setSelectedTemplateId('');
    setInvoiceTemplates([]);
    setTemplateError('');
    if (!lineItemsEnabled || !values.client_id) return undefined;
    let active = true;
    setTemplateLoading(true);
    fetch(`${browserApiBaseUrl}/invoice-templates?client_id=${encodeURIComponent(values.client_id)}`, { credentials: 'include' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || `Could not load templates (${response.status})`);
        if (active) setInvoiceTemplates(body);
      })
      .catch((cause) => {
        if (active) setTemplateError(cause.message);
      })
      .finally(() => {
        if (active) setTemplateLoading(false);
      });
    return () => { active = false; };
  }, [lineItemsEnabled, values.client_id]);

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function insertInvoiceTemplate() {
    const template = invoiceTemplates.find((item) => String(item.id) === selectedTemplateId);
    if (!template) return;
    const textarea = descriptionRef.current;
    const current = String(values.description || '');
    const hasFocus = textarea && document.activeElement === textarea;
    const start = hasFocus ? textarea.selectionStart : current.length;
    const end = hasFocus ? textarea.selectionEnd : current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const description = expandInvoiceTemplate(template.description);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const suffix = after && !description.endsWith('\n') ? '\n' : '';
    const next = `${before}${prefix}${description}${suffix}${after}`;
    const cursor = before.length + prefix.length + description.length + suffix.length;
    setField('description', next);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  function updateLineItem(index, field, value) {
    setLineItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updated = { ...item, [field]: value };
      const hasHours = String(updated.hours ?? '').trim() !== '';
      const hasRate = String(updated.rate ?? '').trim() !== '';
      if (['hours', 'rate', 'total'].includes(field) && hasHours && hasRate) {
        const total = Number(updated.hours) * Number(updated.rate);
        updated.total = Number.isFinite(total) ? String(total) : '';
      }
      return updated;
    }));
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
      if (lineItemsEnabled && field.name === 'cost') {
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
    const missingOption = fields.find((field) => (
      field.required
      && ['select', 'relation'].includes(field.type)
      && String(values[field.name] ?? '').trim() === ''
    ));
    if (missingOption) {
      setError(`${missingOption.label} is required.`);
      return;
    }
    setSaving(true);
    try {
      const lines = lineItemsEnabled ? getLinePayload() : [];
      const response = await fetch(saveEndpoint, {
        method: saveMethod,
        credentials: 'include',
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
          credentials: 'include',
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
          emailResponse = await fetch(emailEndpoint.replace(':id', encodeURIComponent(invoiceId)), { method: 'POST', credentials: 'include' });
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
      const resourceLabel = title.replace(/^(New|Edit)\s+/i, '');
      if (saveMethod === 'POST') {
        const recordName = String(body?.name ?? values.name ?? '').trim()
          || (values.year ? String(values.year) : '')
          || (body?.display_id_number != null ? `${resourceLabel} ${body.display_id_number}` : '')
          || (body?.display_id ? `${resourceLabel} ${body.display_id}` : '')
          || `${resourceLabel}${body?.id != null ? ` #${body.id}` : ''}`;
        const recordHref = createdRecordHref && body?.id != null
          ? createdRecordHref.replace(':id', encodeURIComponent(String(body.id)))
          : null;
        toast.success(recordName, {
          description: `${resourceLabel} created`,
          ...(recordHref ? { action: { label: 'Open', onClick: () => router.push(recordHref) } } : {})
        });
      } else {
        toast.success(`${resourceLabel} updated`);
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
  const selectedClientName = fields
    .find((field) => field.name === 'client_id')?.options
    ?.find((option) => String(option.value) === String(values.client_id))?.label;
  const globalInvoiceTemplates = invoiceTemplates.filter((template) => template.client_id == null);
  const clientInvoiceTemplates = invoiceTemplates.filter((template) => template.client_id != null);
  const globalTemplateSelected = globalInvoiceTemplates.some((template) => String(template.id) === selectedTemplateId);
  const clientTemplateSelected = clientInvoiceTemplates.some((template) => String(template.id) === selectedTemplateId);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-2 border-b border-border pb-5">
        <h1 className="text-2xl font-semibold leading-none">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>
      <form className="record-form" onSubmit={submit}>
        {fields.map((field) => lineItemsEnabled && field.name === 'description' ? (
          <div className="form-field form-field-wide" key={field.name}>
            <span className="form-label" id="invoice-description-label">{field.label}</span>
            <div className="invoice-template-toolbar">
              <div className={`invoice-template-insert${globalInvoiceTemplates.length && clientInvoiceTemplates.length ? ' invoice-template-insert-split' : ''}`}>
                {globalInvoiceTemplates.length > 0 && (
                  <div className="invoice-template-choice">
                    <select
                      aria-label="Global invoice description template"
                      className="invoice-template-select"
                      value={globalTemplateSelected ? selectedTemplateId : ''}
                      onChange={(event) => setSelectedTemplateId(event.target.value)}
                    >
                      <option value="">Global templates</option>
                      {globalInvoiceTemplates.map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <Button type="button" variant="outline" size="icon" aria-label="Insert global template" title="Insert global template" disabled={!globalTemplateSelected} onClick={insertInvoiceTemplate}>
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                )}
                {clientInvoiceTemplates.length > 0 && (
                  <div className="invoice-template-choice">
                    <select
                      aria-label={`${selectedClientName || 'Client'} invoice description template`}
                      className="invoice-template-select"
                      value={clientTemplateSelected ? selectedTemplateId : ''}
                      onChange={(event) => setSelectedTemplateId(event.target.value)}
                    >
                      <option value="">{selectedClientName || 'Client'} templates</option>
                      {clientInvoiceTemplates.map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <Button type="button" variant="outline" size="icon" aria-label={`Insert ${selectedClientName || 'client'} template`} title={`Insert ${selectedClientName || 'client'} template`} disabled={!clientTemplateSelected} onClick={insertInvoiceTemplate}>
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                )}
                {templateLoading && (
                  <div className="grid min-w-0 grid-cols-2 gap-2" role="status" aria-label="Loading invoice templates">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <span className="sr-only">Loading invoice templates</span>
                  </div>
                )}
              </div>
              <Link href="/settings/templates">Manage templates</Link>
            </div>
            {templateError && <Alert className="mt-2" variant="destructive"><AlertDescription>{templateError}</AlertDescription></Alert>}
            <Textarea
              ref={descriptionRef}
              id="invoice-description"
              name={field.name}
              aria-labelledby="invoice-description-label"
              rows={field.rows || 3}
              value={values[field.name]}
              required={field.required}
              onChange={(event) => setField(field.name, event.target.value)}
            />
          </div>
        ) : (
          <label className={`form-field${field.wide ? ' form-field-wide' : ''}`} key={field.name}>
            <span className="form-label">{field.label}{field.required && <span className="required-mark"> *</span>}</span>
            {field.type === 'textarea' ? (
              <Textarea name={field.name} rows={field.rows || 3} value={values[field.name]} required={field.required} onChange={(event) => setField(field.name, event.target.value)} />
            ) : field.type === 'select' || field.type === 'relation' ? (
              <Combobox
                name={field.name}
                required={field.required}
                aria-label={field.label}
                value={String(values[field.name] ?? '')}
                onValueChange={(value) => setField(field.name, value)}
                placeholder="None"
                options={[
                  ...(!field.required ? [{ value: '', label: 'None' }] : []),
                  ...(field.options || [])
                ]}
              />
            ) : field.type === 'date' ? (
              <DatePicker
                name={field.name}
                label={field.label}
                required={field.required}
                min={field.min}
                max={field.max}
                value={values[field.name] || ''}
                onChange={(value) => setField(field.name, value)}
              />
            ) : field.type === 'months' ? (
              <div className="month-goal-grid">
                {monthNames.map((month, index) => (
                  <span className="month-goal-field" key={month}>
                    <span>{month.slice(0, 3)}</span>
                    <Input
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
              <Input
                name={field.name}
                type={field.type || 'text'}
                min={field.min}
                max={field.max}
                step={field.step}
                required={field.required}
                value={lineItemsEnabled && field.name === 'cost' ? lineItemsTotal : values[field.name]}
                readOnly={lineItemsEnabled && field.name === 'cost'}
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
                <label><span>Description</span><Input value={line.description} onChange={(event) => updateLineItem(index, 'description', event.target.value)} /></label>
                <label><span>Hours</span><Input type="number" min="0" step="0.01" value={line.hours} onChange={(event) => updateLineItem(index, 'hours', event.target.value)} /></label>
                <label><span>Rate</span><Input type="number" min="0" step="0.01" placeholder={selectedClientRate == null ? '' : String(selectedClientRate)} value={line.rate} onChange={(event) => updateLineItem(index, 'rate', event.target.value)} /></label>
                <label><span>Amount</span><Input type="number" min="0" step="0.01" value={line.total === '' && line.hours !== '' && line.rate !== '' ? Number(line.hours) * Number(line.rate) : line.total} readOnly={line.hours !== '' && line.rate !== ''} onChange={(event) => updateLineItem(index, 'total', event.target.value)} /></label>
                <Button className="invoice-line-remove" variant="outline" size="sm" type="button" aria-label={`Remove line item ${index + 1}`} onClick={() => setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-4" aria-hidden="true" />Remove</Button>
              </div>
            ))}
            <Button className="invoice-line-add" variant="outline" type="button" onClick={() => setLineItems((current) => [...current, { description: '', hours: '', rate: '', total: '' }])}><Plus className="size-4" aria-hidden="true" />Add line item</Button>
          </section>
        )}
        {error && <Alert className="form-field-wide" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="form-actions">
          <Button aria-busy={saving} disabled={saving} type="submit">{saving ? <Spinner /> : saveMethod === 'POST' ? <Plus className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{saving ? 'Saving...' : submitLabel || 'Save record'}</Button>
          <Button asChild variant="link"><Link href={returnTo}>Cancel</Link></Button>
        </div>
      </form>
    </section>
  );
}
