import Link from 'next/link';
import { ResourcePage, StatusLabel } from '../components/ResourcePage.js';
import { formatDate, formatMoney, invoiceStatus } from '../lib/api.js';
import { getApiData } from '../lib/api-server.js';

function Metric({ label, value, note }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="section-note">{note}</span>
    </div>
  );
}

export default async function Home() {
  const [clientResult, invoiceResult, expenseResult, vendorResult, yearResult] = await Promise.all([
    getApiData('/clients'),
    getApiData('/invoices'),
    getApiData('/expenses'),
    getApiData('/vendors'),
    getApiData('/years')
  ]);
  const clients = clientResult.data || [];
  const invoices = invoiceResult.data || [];
  const expenses = expenseResult.data || [];
  const vendors = vendorResult.data || [];
  const years = yearResult.data || [];
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const paidInvoices = invoices.filter((invoice) => invoiceStatus(invoice) === 'paid');
  const openInvoices = invoices.filter((invoice) => invoiceStatus(invoice) !== 'paid');
  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0);
  const totalOpen = openInvoices.reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.cost || 0), 0);
  const recentInvoices = [...invoices].sort((left, right) => String(right.date).localeCompare(String(left.date))).slice(0, 6);
  const error = [clientResult, invoiceResult, expenseResult, vendorResult, yearResult]
    .find((result) => result.error)?.error;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUSINESS OFFICE / OVERVIEW</p>
          <h1>Overview</h1>
          <p className="page-description">A current view of billing, expenses, and the people behind them.</p>
        </div>
        <div className="heading-count">
          <strong>{new Date().getUTCFullYear()}</strong>
          <span>year</span>
        </div>
      </div>

      {error && <div className="notice" role="alert"><strong>Some data is unavailable</strong><span>{error}</span></div>}

      <section className="metric-grid" aria-label="Business totals">
        <Metric label="Billed" value={formatMoney(totalBilled)} note={`${invoices.length} invoices`} />
        <Metric label="Collected" value={formatMoney(paidInvoices.reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0))} note={`${paidInvoices.length} paid`} />
        <Metric label="Outstanding" value={formatMoney(totalOpen)} note={`${openInvoices.length} open`} />
        <Metric label="Expenses" value={formatMoney(totalExpenses)} note={`${expenses.length} recent records`} />
      </section>

      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>Recent invoices</h2>
            <Link className="inline-link section-note" href="/invoices">All invoices</Link>
          </div>
          <ResourcePage
            hideHeading
            data={recentInvoices}
            error={invoiceResult.error}
            count={recentInvoices.length}
            columns={[
              { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>INV-{String(invoice.id).padStart(4, '0')}</Link> },
              { key: 'client', label: 'Client', render: (invoice) => clientsById.get(invoice.client_id)?.name || `Client ${invoice.client_id || '-'}` },
              { key: 'date', label: 'Date', render: (invoice) => formatDate(invoice.date) },
              { key: 'status', label: 'Status', render: (invoice) => <StatusLabel status={invoiceStatus(invoice)} /> },
              { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) }
            ]}
          />
        </section>
        <section>
          <div className="section-heading"><h2>Records</h2><span className="section-note">Browse by type</span></div>
          <div className="quick-links">
            <Link className="quick-link" href="/clients"><span>Clients</span><span>{clients.length}</span></Link>
            <Link className="quick-link" href="/vendors"><span>Vendors</span><span>{vendors.length}</span></Link>
            <Link className="quick-link" href="/years"><span>Years</span><span>{years.length}</span></Link>
            <Link className="quick-link" href="/expenses"><span>Expenses</span><span>{expenses.length}</span></Link>
          </div>
        </section>
      </div>
    </>
  );
}
