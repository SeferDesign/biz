import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import { browserApiBaseUrl, formatDate, formatMoney, getApiData, parsePage } from '../../../lib/api.js';

export default async function YearDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const [yearResult, incomeResult, expenseResult] = await Promise.all([
    getApiData(`/years/${encodeURIComponent(id)}`),
    getApiData(`/years/${encodeURIComponent(id)}/income`),
    getApiData(`/years/${encodeURIComponent(id)}/expenses`)
  ]);
  if (yearResult.status === 404) notFound();
  if (yearResult.error) {
    return <div className="notice" role="alert"><strong>Year unavailable</strong><span>{yearResult.error}</span></div>;
  }

  const year = yearResult.data;
  const invoices = incomeResult.data?.invoices || [];
  const expenses = expenseResult.data?.expenses || [];
  const incomePageQuery = new URLSearchParams();
  const expensePageQuery = new URLSearchParams();
  if (query?.expense_page) incomePageQuery.set('expense_page', String(query.expense_page));
  if (query?.income_page) expensePageQuery.set('income_page', String(query.income_page));
  const incomePageHref = `/years/${year.id}${incomePageQuery.size ? `?${incomePageQuery}` : ''}`;
  const expensePageHref = `/years/${year.id}${expensePageQuery.size ? `?${expensePageQuery}` : ''}`;
  return (
    <>
      <Link className="back-link" href="/years">&lt; All years</Link>
      <div className="page-heading">
        <div><p className="eyebrow">YEAR</p><h1>{year.year}</h1><p className="page-description">Annual income, expenses, and tax estimate.</p></div>
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
        <div className="section-heading"><h2>Paid invoices</h2><span className="section-note">{incomeResult.data?.total != null ? formatMoney(incomeResult.data.total) : '-'}</span></div>
        {incomeResult.error ? <div className="notice" role="alert"><span>{incomeResult.error}</span></div> : (
          <ResourcePage
            hideHeading
            data={invoices}
            pageHref={incomePageHref}
            pageParam="income_page"
            page={parsePage(query?.income_page)}
            columns={[
              { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>INV-{String(invoice.id).padStart(4, '0')}</Link> },
              { key: 'date', label: 'Payment date', render: (invoice) => formatDate(invoice.paiddate || invoice.date) },
              { key: 'description', label: 'Description' },
              { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) }
            ]}
          />
        )}
      </section>
      <section className="detail-section">
        <div className="section-heading"><h2>Expenses</h2><span className="section-note">{expenseResult.data?.total != null ? formatMoney(expenseResult.data.total) : '-'}</span></div>
        {expenseResult.error ? <div className="notice" role="alert"><span>{expenseResult.error}</span></div> : (
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
