import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage } from '../../../components/ResourcePage.js';
import Notice from '../../../components/Notice.js';
import ResourceActions from '../../../components/ResourceActions.js';
import ColumnChart from '../../../components/charts/ColumnChart.js';
import DonutChart from '../../../components/charts/DonutChart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.js';
import { Separator } from '../../../components/ui/separator.js';
import { chartColors, financeBars, goalOutlines } from '../../../components/charts/theme.js';
import { browserApiBaseUrl, formatDate, formatMoney, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';
import {
  calendarMonths, monthlyFinances, monthlyRunRate, onOrBefore, quarterlyTaxes, totalsByCategory
} from '../../../lib/chart-data.js';

export default async function YearDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const [yearResult, incomeResult, expenseResult, vendorResult] = await Promise.all([
    getApiData(`/years/${encodeURIComponent(id)}`),
    getApiData(`/years/${encodeURIComponent(id)}/income`),
    getApiData(`/years/${encodeURIComponent(id)}/expenses`),
    getApiData('/vendors')
  ]);
  if (yearResult.status === 404) notFound();
  if (yearResult.error) {
    return <Notice title="Year unavailable">{yearResult.error}</Notice>;
  }

  const year = yearResult.data;
  const invoices = incomeResult.data?.invoices || [];
  const expenses = expenseResult.data?.expenses || [];
  const monthlyData = monthlyFinances(calendarMonths(Number(year.year)), { invoices, expenses, years: [year] });
  const monthlyGoal = Number(year.goal_year) > 0 ? Number(year.goal_year) / 12 : null;
  const runRate = monthlyRunRate(Number(year.income_total || 0), Number(year.year));
  const quarters = quarterlyTaxes(monthlyData, year.taxrate);
  const expensesToDate = onOrBefore(expenses, (expense) => expense.date);
  const expenseCategories = totalsByCategory(expensesToDate, vendorResult.data || []);
  const expenseMonths = monthlyFinances(calendarMonths(Number(year.year)), { expenses: expensesToDate });
  const expenseRunRate = monthlyRunRate(expensesToDate.reduce((total, expense) => total + Number(expense.cost || 0), 0), Number(year.year));
  const incomePageQuery = new URLSearchParams();
  const expensePageQuery = new URLSearchParams();
  if (query?.expense_page) incomePageQuery.set('expense_page', String(query.expense_page));
  if (query?.income_page) expensePageQuery.set('income_page', String(query.income_page));
  const incomePageHref = `/years/${year.id}${incomePageQuery.size ? `?${incomePageQuery}` : ''}`;
  const expensePageHref = `/years/${year.id}${expensePageQuery.size ? `?${expensePageQuery}` : ''}`;
  return (
    <>
      <div className="page-heading">
        <div><h1>{year.year}</h1><p className="page-description">Annual income, expenses, and tax estimate.</p></div>
        <ResourceActions editHref={`/years/${year.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/years/${year.id}`} returnTo="/years" label="year" />
      </div>
      <DetailGrid items={[
        ['Paid income', formatMoney(year.income_total)],
        ['Expenses', formatMoney(year.expenses_total)],
        ['Net income', formatMoney(year.net_income)],
        ['Tax rate', `${(Number(year.taxrate || 0) * 100).toFixed(1)}%`],
        ['Estimated tax', formatMoney(year.tax_owed)],
        ['Annual goal', formatMoney(year.goal_year)]
      ]} />
      <section className="detail-section">
        <div className="section-heading">
          <h2>Monthly</h2>
          <span className="section-note">Average is the monthly revenue run rate from income collected to date</span>
        </div>
        <ColumnChart
          label={`Monthly revenue, expenses, and goals for ${year.year}`}
          data={monthlyData}
          stacked
          format="currency"
          maxBarSize={48}
          bars={financeBars}
          outlines={goalOutlines}
          lines={[
            { value: monthlyGoal, label: 'GOAL', color: chartColors.goal, dashed: true },
            { value: runRate, label: 'AVERAGE', color: chartColors.revenue }
          ]}
        />
      </section>
      <section className="detail-section">
        <div className="section-heading"><h2>Quarterly tax estimates</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quarters.map((quarter) => (
            <Card className="h-full" key={quarter.quarter}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quarter {quarter.quarter}</CardTitle>
                <CardDescription>{quarter.firstMonth} - {quarter.lastMonth}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Separator />
                <dl className="space-y-3 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Income</dt>
                    <dd className="m-0 font-medium tabular-nums">{formatMoney(quarter.income)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Tax estimate</dt>
                    <dd className="m-0 font-medium tabular-nums">{formatMoney(quarter.taxEstimate)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Payment estimate*</dt>
                    <dd className="m-0 font-semibold tabular-nums">{formatMoney(quarter.paymentEstimate)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">* Based on IRS estimated-tax payment periods: January - March, April - May, June - August, September - December.</p>
      </section>
      <div className="chart-columns detail-section">
        <section>
          <div className="section-heading"><h2>Expenses by category</h2><span className="section-note">To date</span></div>
          {expenseCategories.length ? (
            <DonutChart label={`Expenses by category for ${year.year}`} data={expenseCategories} format="currency" />
          ) : <p className="section-note">No expenses to date.</p>}
        </section>
        <section>
          <div className="section-heading"><h2>Expenses by month</h2><span className="section-note">To date; average is the monthly run rate</span></div>
          <ColumnChart
            label={`Expenses by month for ${year.year}`}
            data={expenseMonths}
            format="currency"
            maxBarSize={32}
            bars={[{ key: 'expenses', label: 'Expenses', color: chartColors.expenses }]}
            lines={[{ value: expenseRunRate, label: 'AVERAGE', color: chartColors.revenue }]}
          />
        </section>
      </div>
      <section className="detail-section">
        <div className="section-heading">
          <h2>Paid invoices</h2>
          <span className="section-note">
            {incomeResult.data?.total != null ? formatMoney(incomeResult.data.total) : '-'}
            {' · '}<a className="inline-link" href={`${browserApiBaseUrl}/years/${year.id}/income/csv`} download>Download CSV</a>
          </span>
        </div>
        {incomeResult.error ? <Notice>{incomeResult.error}</Notice> : (
          <ResourcePage
            hideHeading
            data={invoices}
            pageHref={incomePageHref}
            pageParam="income_page"
            page={parsePage(query?.income_page)}
            columns={[
              { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>{invoice.display_id || invoice.display_id_number || invoice.id}</Link> },
              { key: 'date', label: 'Payment date', render: (invoice) => formatDate(invoice.paiddate || invoice.date) },
              { key: 'description', label: 'Description' },
              { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) }
            ]}
          />
        )}
      </section>
      <section className="detail-section">
        <div className="section-heading">
          <h2>Expenses</h2>
          <span className="section-note">
            {expenseResult.data?.total != null ? formatMoney(expenseResult.data.total) : '-'}
            {' · '}<a className="inline-link" href={`${browserApiBaseUrl}/years/${year.id}/expenses/csv`} download>Download CSV</a>
          </span>
        </div>
        {expenseResult.error ? <Notice>{expenseResult.error}</Notice> : (
          <ResourcePage
            hideHeading
            data={expenses}
            pageHref={expensePageHref}
            pageParam="expense_page"
            page={parsePage(query?.expense_page)}
            columns={[
              { key: 'date', label: 'Date', render: (expense) => formatDate(expense.date) },
              { key: 'name', label: 'Expense' },
              { key: 'account', label: 'Account' },
              { key: 'cost', label: 'Cost', className: 'numeric-cell', render: (expense) => formatMoney(expense.cost) }
            ]}
          />
        )}
      </section>
    </>
  );
}
