'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatMoney } from '../lib/api.js';
import { expenseAccountOptions } from '../lib/record-fields.js';
import { recordsPerPage } from '../lib/api.js';

const blankExpense = () => ({ name: '', vendor_id: '', date: '', cost: '', account: '', notes: '' });

function editableExpense(expense) {
  return {
    ...expense,
    vendor_id: expense.vendor_id == null ? '' : String(expense.vendor_id),
    date: String(expense.date || '').slice(0, 10),
    cost: expense.cost == null ? '' : String(expense.cost),
    account: expense.account || '',
    notes: expense.notes || ''
  };
}

function apiExpense(expense) {
  return {
    name: expense.name.trim(),
    vendor_id: expense.vendor_id ? Number(expense.vendor_id) : null,
    date: expense.date,
    cost: Number(expense.cost),
    account: expense.account.trim() || null,
    notes: expense.notes.trim() || null
  };
}

async function requestExpenses(url, method, expenses) {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenses })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body.expenses;
}

function SheetCell({ label, type = 'text', value, onChange, vendors, step }) {
  if (type === 'vendor') {
    return (
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No vendor</option>
        {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
      </select>
    );
  }
  if (type === 'account') {
    return (
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No account</option>
        {expenseAccountOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }
  return <input aria-label={label} type={type} step={step} min={type === 'number' ? '0' : undefined} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function ExpenseRow({ expense, vendors, label, onChange, showId = false }) {
  const fields = [
    ['date', 'Date', 'date'],
    ['name', 'Expense', 'text'],
    ['vendor_id', 'Vendor', 'vendor'],
    ['account', 'Account', 'account'],
    ['cost', 'Cost', 'number'],
    ['notes', 'Notes', 'text']
  ];

  return (
    <tr>
      {showId && <td className="sheet-id">{expense.id}</td>}
      {fields.map(([field, title, type]) => (
        <td key={field}>
          <SheetCell
            label={`${label} ${title}`}
            type={type}
            step={type === 'number' ? '0.01' : undefined}
            value={expense[field]}
            vendors={vendors}
            onChange={(value) => onChange(field, value)}
          />
        </td>
      ))}
    </tr>
  );
}

function SpreadsheetTable({ children, includeId = false }) {
  return (
    <div className="table-wrap spreadsheet-wrap">
      <table className="data-table spreadsheet-table">
        <thead>
          <tr>
            {includeId && <th>ID</th>}
            <th>Date</th><th>Expense</th><th>Vendor</th><th>Account</th><th className="numeric-cell">Cost</th><th>Notes</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function ExpenseSpreadsheet({ initialExpenses, vendors, apiBaseUrl }) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(() => initialExpenses.map(editableExpense));
  const [drafts, setDrafts] = useState(() => Array.from({ length: 3 }, blankExpense));
  const [page, setPage] = useState(1);
  const [dirtyIds, setDirtyIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const changedCount = dirtyIds.size;
  const draftCount = drafts.filter((expense) => Object.values(expense).some(Boolean)).length;
  const pageCount = Math.max(1, Math.ceil(expenses.length / recordsPerPage));
  const currentPage = Math.min(page, pageCount);
  const visibleExpenses = expenses.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  function updateExisting(id, field, value) {
    setExpenses((current) => current.map((expense) => expense.id === id ? { ...expense, [field]: value } : expense));
    setDirtyIds((current) => new Set(current).add(id));
    setMessage('');
  }

  function updateDraft(index, field, value) {
    setDrafts((current) => current.map((expense, row) => row === index ? { ...expense, [field]: value } : expense));
    setMessage('');
  }

  async function saveChanges() {
    if (!changedCount) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const rows = expenses.filter((expense) => dirtyIds.has(expense.id));
      const saved = await requestExpenses(`${apiBaseUrl}/expenses/bulk`, 'PATCH', rows.map((expense) => ({ id: expense.id, ...apiExpense(expense) })));
      const savedById = new Map(saved.map((expense) => [expense.id, editableExpense(expense)]));
      setExpenses((current) => current.map((expense) => savedById.get(expense.id) || expense));
      setDirtyIds(new Set());
      setMessage(`Saved ${saved.length} expense${saved.length === 1 ? '' : 's'}.`);
      router.refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function addExpenses() {
    const entered = drafts.filter((expense) => Object.values(expense).some(Boolean));
    if (!entered.length) {
      setError('Enter at least one new expense row.');
      return;
    }
    const invalid = entered.find((expense) => !expense.name.trim() || !expense.date || expense.cost === '' || !Number.isFinite(Number(expense.cost)));
    if (invalid) {
      setError('Each new row needs a date, expense name, and numeric cost.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const added = await requestExpenses(`${apiBaseUrl}/expenses/bulk`, 'POST', entered.map(apiExpense));
      const nextExpenses = [...expenses, ...added.map(editableExpense)].sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));
      setExpenses(nextExpenses);
      setPage(Math.max(1, Math.ceil(nextExpenses.length / recordsPerPage)));
      setDrafts(Array.from({ length: 3 }, blankExpense));
      setMessage(`Added ${added.length} expense${added.length === 1 ? '' : 's'}.`);
      router.refresh();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link className="back-link" href="/expenses">&lt; All expenses</Link>
      <div className="page-heading">
        <div><h1>Bulk expenses</h1><p className="page-description">Edit rows in place or enter several expenses, then save each batch.</p></div>
        <span className="sheet-count">{expenses.length} records</span>
      </div>

      <div className="sheet-toolbar">
        <span className="sheet-state">{changedCount ? `${changedCount} unsaved change${changedCount === 1 ? '' : 's'}` : message || 'All changes saved'}</span>
        <button className="primary-button" type="button" disabled={busy || !changedCount} onClick={saveChanges}>{busy ? 'Saving...' : `Save changes${changedCount ? ` (${changedCount})` : ''}`}</button>
      </div>
      {error && <div className="notice sheet-notice" role="alert"><strong>Could not save batch</strong><span>{error}</span></div>}

      <section className="sheet-section">
        <div className="section-heading"><h2>Edit expenses</h2><span className="section-note">Changes are saved together.</span></div>
        {expenses.length ? (
          <SpreadsheetTable includeId>
            {visibleExpenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} vendors={vendors} label={`Expense ${expense.id}`} showId onChange={(field, value) => updateExisting(expense.id, field, value)} />
            ))}
          </SpreadsheetTable>
        ) : <div className="empty-state"><h2>No expenses</h2><p>Add new rows below to get started.</p></div>}
        {pageCount > 1 && (
          <nav className="pagination" aria-label="Spreadsheet pagination">
            <button className="pagination-link" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <span className="pagination-status">Page {currentPage} of {pageCount} · Showing {(currentPage - 1) * recordsPerPage + 1}–{Math.min(currentPage * recordsPerPage, expenses.length)} of {expenses.length}</span>
            <button className="pagination-link" type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
          </nav>
        )}
      </section>

      <section className="sheet-section">
        <div className="section-heading">
          <h2>Add expenses</h2>
          <button className="secondary-button" type="button" disabled={busy} onClick={() => setDrafts((current) => [...current, ...Array.from({ length: 5 }, blankExpense)])}>Add 5 rows</button>
        </div>
        <SpreadsheetTable>
          {drafts.map((expense, index) => (
            <ExpenseRow key={index} expense={expense} vendors={vendors} label={`New expense row ${index + 1}`} onChange={(field, value) => updateDraft(index, field, value)} />
          ))}
        </SpreadsheetTable>
        <div className="sheet-add-action">
          <span className="section-note">{draftCount} filled row{draftCount === 1 ? '' : 's'}</span>
          <button className="primary-button" type="button" disabled={busy || !draftCount} onClick={addExpenses}>{busy ? 'Saving...' : `Add expenses${draftCount ? ` (${draftCount})` : ''}`}</button>
        </div>
      </section>
    </>
  );
}
