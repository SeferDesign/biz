import Link from 'next/link';
import { Wallet, CalendarDays, CalendarFold } from 'lucide-react';
import { ResourcePage, StatusBadge } from '../components/ResourcePage.js';
import InvoiceActions from '../components/InvoiceActions.js';
import Notice from '../components/Notice.js';
import ColumnChart from '../components/charts/ColumnChart.js';
import { financeBars, goalOutlines } from '../components/charts/theme.js';
import { formatMoney, formatTableDate, invoiceStatus } from '../lib/api.js';
import { getApiData } from '../lib/api-server.js';
import { monthlyGoal, trailingMonths } from '../lib/chart-data.js';
import { iconColors } from '../lib/icon-colors.js';
import { Badge } from '../components/ui/badge.js';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.js';

export default async function Home() {
  const summaryResult = await getApiData('/dashboard');
  const summary = summaryResult.data || {};
  const yearRecords = summary.yearRecords || [];
  const recentInvoices = summary.recentInvoices || [];
  const monthlyRevenue = summary.monthlyRevenue || {};
  const monthlyExpenses = summary.monthlyExpenses || {};
  const now = new Date();
  const currentYear = Number(summary.year) || now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const monthNumber = monthIndex + 1;
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(currentYear, monthIndex, 1)));
  const yearRecord = yearRecords.find((year) => Number(year.year) === currentYear);
  const monthGoal = Number(yearRecord?.goals_months?.[monthIndex]);
  const monthKey = `${currentYear}-${String(monthNumber).padStart(2, '0')}`;
  const trailingFinances = trailingMonths(5).map(({ key, year, month, label }) => {
    const revenue = Number(monthlyRevenue[key] || 0);
    const expenses = Number(monthlyExpenses[key] || 0);
    return {
      label,
      revenue,
      expenses,
      revenueOverExpenses: Math.max(revenue - expenses, 0),
      goal: monthlyGoal(yearRecords, year, month)
    };
  });

  const financialRows = [
		{
			label: monthLabel,
			goal: monthGoal > 0 ? monthGoal : Number(yearRecord?.goal_year || 0) / 12,
			revenue: Number(monthlyRevenue[monthKey] || 0),
			expenses: Number(monthlyExpenses[monthKey] || 0),
			icon: CalendarFold
		},
    {
      label: String(currentYear),
      href: yearRecord ? `/years/${yearRecord.year}` : '/years',
      goal: Number(yearRecord?.goal_year || 0),
      revenue: Number(summary.yearRevenue || 0),
      expenses: Number(summary.yearExpenses || 0),
			icon: CalendarDays
    }
  ].map((row) => ({
    ...row,
    net: row.revenue - row.expenses,
    goalProgress: row.goal > 0 ? Math.round((row.revenue / row.goal) * 100) : null
  }));

  return (
    <>

      {summaryResult.error && <Notice title="Some data is unavailable">{summaryResult.error}</Notice>}

      <section className="overview-finance" aria-label="Receivables and current period finances">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="min-w-0 md:col-span-2 xl:col-span-1">
            <CardHeader className="relative p-4 pb-3">
              <CardDescription className="flex items-center gap-2"><Wallet className="size-4 text-warning" aria-hidden="true" />Receivable</CardDescription>
              <CardTitle className="w-full text-end text-2xl font-semibold tabular-nums">{formatMoney(summary.openInvoices?.total)}</CardTitle>
              <Badge variant={Number(summary.openInvoices?.count) > 0 ? 'warning' : 'secondary'} className="absolute right-4 top-4">
                {summary.openInvoices?.count || 0} {Number(summary.openInvoices?.count) === 1 ? 'invoice' : 'invoices'}
              </Badge>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 px-4 pb-4 pt-0 text-sm md:flex-row md:items-center md:justify-between">
              <p className="font-medium">Outstanding balance</p>
              <p className="text-muted-foreground">Across all open invoices</p>
            </CardFooter>
          </Card>
          {financialRows.map((row) => (
            <Card key={row.label} className="min-w-0">
              <CardHeader className="relative p-4 pb-3">
                <CardDescription className="flex items-center gap-2">
                  <row.icon className={`size-4 ${iconColors.years}`} aria-hidden="true" />
                  {row.href ? <Link className="inline-link" href={row.href}>{row.label}</Link> : row.label}
                </CardDescription>
                <CardTitle className="w-full text-end text-2xl font-semibold tabular-nums">{formatMoney(row.revenue)}</CardTitle>
                <Badge variant={row.goalProgress === null ? 'secondary' : row.goalProgress >= 100 ? 'success' : 'info'} className="absolute right-4 top-4">
                  {row.goalProgress === null ? 'No goal' : `${row.goalProgress}% of goal`}
                </Badge>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1 px-4 pb-4 pt-0 text-sm">
                <p className="flex w-full items-center justify-between gap-2 text-muted-foreground">
                  <span>Expenses</span>
                  <span className="font-mono tabular-nums text-end">{formatMoney(row.expenses)}</span>
                </p>
                <p className="flex w-full items-center justify-between gap-2 font-medium">
                  <span>Net</span>
                  <span className={`font-mono tabular-nums text-end ${row.net < 0 ? 'amount-negative' : 'amount-positive'}`}>
                    {formatMoney(row.net)}
                  </span>
                </p>
								{/* {row.goal && (
									<p className="flex w-full items-center justify-between gap-2 text-muted-foreground italic">
										<span>Goal</span>
										<span className="font-mono tabular-nums text-end">{formatMoney(row.goal)}</span>
									</p>
								)} */}
              </CardFooter>
            </Card>
          ))}
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
          error={summaryResult.error}
          count={recentInvoices.length}
          columns={[
            { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>{invoice.display_id || invoice.display_id_number || invoice.id}</Link> },
            { key: 'client', label: 'Client', render: (invoice) => invoice.client_name || `Client ${invoice.client_id || '-'}` },
            { key: 'date', label: 'Date', className: 'date-cell', render: (invoice) => formatTableDate(invoice.date) },
            { key: 'status', label: 'Status', render: (invoice) => <StatusBadge status={invoiceStatus(invoice)} /> },
            { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) },
            { key: 'actions', label: 'Actions', render: (invoice) => <InvoiceActions invoice={invoice} compact /> }
          ]}
        />
      </section>
    </>
  );
}
