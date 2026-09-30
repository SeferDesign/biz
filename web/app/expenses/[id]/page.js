import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import { browserApiBaseUrl, formatDate, formatMoney } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function ExpenseDetailPage({ params }) {
  const { id } = await params;
  const [expenseResult, vendorResult] = await Promise.all([
    getApiData(`/expenses/${encodeURIComponent(id)}`),
    getApiData('/vendors')
  ]);
  if (expenseResult.status === 404) notFound();
  if (expenseResult.error) return <div className="notice" role="alert"><strong>Expense unavailable</strong><span>{expenseResult.error}</span></div>;

  const expense = expenseResult.data;
  const vendor = (vendorResult.data || []).find((item) => item.id === expense.vendor_id);
  return (
    <>
      <Link className="back-link" href="/expenses">&lt; All expenses</Link>
      <div className="page-heading">
        <div><p className="eyebrow">EXPENSE RECORD</p><h1>{expense.name}</h1><p className="page-description">{formatDate(expense.date)}</p></div>
        <ResourceActions editHref={`/expenses/${expense.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/expenses/${expense.id}`} returnTo="/expenses" label="expense" />
      </div>
      <DetailGrid items={[
        ['Cost', formatMoney(expense.cost)],
        ['Vendor', vendor ? <Link href={`/vendors/${vendor.id}`} key="vendor">{vendor.name}</Link> : '-'],
        ['Account', expense.account],
        ['Date', formatDate(expense.date)],
        ['Notes', expense.notes]
      ]} />
    </>
  );
}
