import Link from 'next/link';
import { ResourcePage, StatusLabel } from '../components/ResourcePage.js';
import InvoiceActions from '../components/InvoiceActions.js';
import ColumnChart from '../components/charts/ColumnChart.js';
import { financeBars, goalOutlines } from '../components/charts/theme.js';
import { formatDate, formatMoney, invoiceStatus, newestInvoicesFirst } from '../lib/api.js';
import { getApiData } from '../lib/api-server.js';
import { monthlyFinances, trailingMonths } from '../lib/chart-data.js';

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
  const [clientResult, invoiceResult, expenseResult, yearResult] = await Promise.all([
    getApiData('/clients'),
    getApiData('/invoices'),
    getApiData('/expenses'),
    getApiData('/years')
  ]);
  const clients = clientResult.data || [];
  const invoices = invoiceResult.data || [];
  const expenses = expenseResult.data || [];
  const years = yearResult.data || [];
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const paidInvoices = invoices.filter((invoice) => invoiceStatus(invoice) === 'paid');
  const openInvoices = invoices.filter((invoice) => invoiceStatus(invoice) !== 'paid');
  const totalBilled = invoices.reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0);
  const totalOpen = openInvoices.reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.cost || 0), 0);
  const recentInvoices = [...invoices].sort(newestInvoicesFirst).slice(0, 6);
  const trailingFinances = monthlyFinances(trailingMonths(5), { invoices, expenses, years });
  const error = [clientResult, invoiceResult, expenseResult, yearResult]
    .find((result) => result.error)?.error;

  return (
    <>
      <div className="page-heading">
        <div>
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

      <section className="chart-section">
        <div className="section-heading">
          <h2>Trailing 5 months</h2>
          <span className="section-note">Revenue and expenses against monthly goals</span>
        </div>
        <ColumnChart
          label="Revenue, expenses, and goals for the trailing 5 months"
          data={trailingFinances}
          stacked
          format="currency"
          bars={financeBars}
          outlines={goalOutlines}
        />
      </section>

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
            { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) },
            { key: 'actions', label: 'Actions', render: (invoice) => <InvoiceActions invoice={invoice} compact /> }
          ]}
        />
      </section>
    </>
  );
}
