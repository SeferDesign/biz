import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewButton from '../../../components/NewButton.js';
import { DetailGrid, ResourcePage } from '../../../components/ResourcePage.js';
import Notice from '../../../components/Notice.js';
import ResourceActions from '../../../components/ResourceActions.js';
import { browserApiBaseUrl, formatMoney, formatTableDate, newestExpensesFirst, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export const metadata = { title: 'Vendor Details' };

export default async function VendorDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const [vendorResult, expenseResult] = await Promise.all([
    getApiData(`/vendors/${encodeURIComponent(id)}`),
    getApiData('/expenses?inactive=true')
  ]);
  if (vendorResult.status === 404) notFound();
  if (vendorResult.error) return <Notice title="Vendor unavailable">{vendorResult.error}</Notice>;

  const vendor = vendorResult.data;
  const expenses = (expenseResult.data || [])
    .filter((expense) => Number(expense.vendor_id) === Number(vendor.id))
    .sort(newestExpensesFirst);
  return (
    <>
      <div className="page-heading">
        <div><h1>{vendor.name}</h1><p className="page-description">{vendor.category || 'Uncategorized vendor'}</p></div>
        <div className="heading-actions">
          <NewButton href={`/expenses/new?vendor_id=${encodeURIComponent(vendor.id)}`} label="New expense" />
          <ResourceActions editHref={`/vendors/${vendor.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/vendors/${vendor.id}`} returnTo="/vendors" label="vendor" />
        </div>
      </div>
      <DetailGrid items={[
        ['Category', vendor.category],
        ['Notes', vendor.notes],
        ['Expense records', expenses.length],
        ['Recorded spend', formatMoney(expenses.reduce((total, expense) => total + Number(expense.cost || 0), 0))]
      ]} />
      <section className="detail-section">
        <div className="section-heading"><h2>Expenses</h2></div>
        {expenseResult.error ? <Notice>{expenseResult.error}</Notice> : (
          <ResourcePage
            hideHeading
            data={expenses}
            pageHref={`/vendors/${vendor.id}`}
            page={parsePage(query?.page)}
            columns={[
              { key: 'date', label: 'Date', className: 'date-cell', render: (expense) => <Link className="table-link" href={`/expenses/${expense.id}`}>{formatTableDate(expense.date)}</Link> },
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
