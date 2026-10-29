import Link from 'next/link';
import { ResourcePage, StatusBadge } from '../components/ResourcePage.js';
import InvoiceActions from '../components/InvoiceActions.js';
import Notice from '../components/Notice.js';
import ColumnChart from '../components/charts/ColumnChart.js';
import { financeBars, goalOutlines } from '../components/charts/theme.js';
import { formatDate, formatMoney, invoiceStatus, newestInvoicesFirst } from '../lib/api.js';
import { getApiData } from '../lib/api-server.js';
import { monthlyFinances, trailingMonths } from '../lib/chart-data.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.js';

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

function sumInvoices(invoices, predicate) {
  return invoices
    .filter(predicate)
    .reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0);
}

function sumExpenses(expenses, predicate) {
  return expenses
    .filter(predicate)
    .reduce((sum, expense) => sum + Number(expense.cost || 0), 0);
}

function dateInRange(value, start, end) {
  const date = String(value || '').slice(0, 10);
  return date >= start && date <= end;
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
  const totalOpen = openInvoices.reduce((sum, invoice) => sum + Number(invoice.cost ?? invoice.total ?? 0), 0);
  const recentInvoices = [...invoices].sort(newestInvoicesFirst).slice(0, 6);
  const trailingFinances = monthlyFinances(trailingMonths(5), { invoices, expenses, years });
  const error = [clientResult, invoiceResult, expenseResult, yearResult]
    .find((result) => result.error)?.error;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const monthNumber = monthIndex + 1;
  const monthLabel = monthFormatter.format(new Date(Date.UTC(currentYear, monthIndex, 1)));
  const yearRecord = years.find((year) => Number(year.year) === currentYear);
  const monthGoal = Number(yearRecord?.goals_months?.[monthIndex]);

  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const monthStart = `${currentYear}-${String(monthNumber).padStart(2, '0')}-01`;
  const monthEnd = `${currentYear}-${String(monthNumber).padStart(2, '0')}-31`;

  const yearRevenue = sumInvoices(paidInvoices, (invoice) => dateInRange(invoice.paiddate || invoice.date, yearStart, yearEnd));
  const yearExpenses = sumExpenses(expenses, (expense) => dateInRange(expense.date, yearStart, yearEnd));
  const monthRevenue = sumInvoices(paidInvoices, (invoice) => dateInRange(invoice.paiddate || invoice.date, monthStart, monthEnd));
  const monthExpenses = sumExpenses(expenses, (expense) => dateInRange(expense.date, monthStart, monthEnd));

  const financialRows = [
    {
      label: String(currentYear),
      href: yearRecord ? `/years/${yearRecord.id}` : '/years',
      goal: Number(yearRecord?.goal_year || 0),
      revenue: yearRevenue,
      expenses: yearExpenses
    },
    {
      label: monthLabel,
      goal: monthGoal > 0 ? monthGoal : Number(yearRecord?.goal_year || 0) / 12,
      revenue: monthRevenue,
      expenses: monthExpenses
    }
  ].map((row) => ({ ...row, net: row.revenue - row.expenses }));

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Overview</h1>
        </div>
      </div>

      {error && <Notice title="Some data is unavailable">{error}</Notice>}

      <section className="overview-finance" aria-label="Current receivables and goals">
        <p className="overview-receivable">Total Receivable: <strong>{formatMoney(totalOpen)}</strong> ({openInvoices.length} invoices)</p>
        <div className="table-wrap">
          <Table className="data-table overview-table">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" />
                <TableHead scope="col">Goal</TableHead>
                <TableHead scope="col">Revenue</TableHead>
                <TableHead scope="col">Expenses</TableHead>
                <TableHead scope="col">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="primary-cell">
                    {row.href ? <Link className="inline-link" href={row.href}>{row.label}</Link> : row.label}
                  </TableCell>
                  <TableCell className="numeric-cell">{formatMoney(row.goal)}</TableCell>
                  <TableCell className="numeric-cell amount-positive">{formatMoney(row.revenue)}</TableCell>
                  <TableCell className="numeric-cell amount-negative">{formatMoney(row.expenses)}</TableCell>
                  <TableCell className="numeric-cell">{formatMoney(row.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="chart-section">
        <div className="section-heading">
          <h2>Trailing 5 months</h2>
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
            { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>{invoice.display_id || invoice.display_id_number || invoice.id}</Link> },
            { key: 'client', label: 'Client', render: (invoice) => clientsById.get(invoice.client_id)?.name || `Client ${invoice.client_id || '-'}` },
            { key: 'date', label: 'Date', render: (invoice) => formatDate(invoice.date) },
            { key: 'status', label: 'Status', render: (invoice) => <StatusBadge status={invoiceStatus(invoice)} /> },
            { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) },
            { key: 'actions', label: 'Actions', render: (invoice) => <InvoiceActions invoice={invoice} compact /> }
          ]}
        />
      </section>
    </>
  );
}
