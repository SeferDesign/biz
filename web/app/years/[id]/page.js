import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage } from '../../../components/ResourcePage.js';
import { formatDate, formatMoney, getApiData } from '../../../lib/api.js';

export default async function YearDetailPage({ params }) {
  const { id } = await params;
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
  return (
    <>
      <Link className="back-link" href="/years">&lt; All years</Link>
      <div className="page-heading">
        <div><p className="eyebrow">FINANCIAL YEAR</p><h1>{year.year}</h1><p className="page-description">Annual income, expenses, and tax estimate.</p></div>
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
