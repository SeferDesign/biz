import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import { browserApiBaseUrl, formatMoney, getApiData } from '../../../lib/api.js';

export default async function VendorDetailPage({ params }) {
  const { id } = await params;
  const [vendorResult, expenseResult] = await Promise.all([
    getApiData(`/vendors/${encodeURIComponent(id)}`),
    getApiData('/expenses?inactive=true')
  ]);
  if (vendorResult.status === 404) notFound();
  if (vendorResult.error) return <div className="notice" role="alert"><strong>Vendor unavailable</strong><span>{vendorResult.error}</span></div>;

  const vendor = vendorResult.data;
  const expenses = (expenseResult.data || []).filter((expense) => expense.vendor_id === vendor.id);
  return (
    <>
      <Link className="back-link" href="/vendors">&lt; All vendors</Link>
      <div className="page-heading">
        <div><p className="eyebrow">VENDOR RECORD</p><h1>{vendor.name}</h1><p className="page-description">{vendor.category || 'Uncategorized vendor'}</p></div>
        <ResourceActions editHref={`/vendors/${vendor.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/vendors/${vendor.id}`} returnTo="/vendors" label="vendor" />
      </div>
      <DetailGrid items={[
        ['Category', vendor.category],
        ['Notes', vendor.notes],
        ['Expense records', expenses.length],
        ['Recorded spend', formatMoney(expenses.reduce((total, expense) => total + Number(expense.cost || 0), 0))]
      ]} />
      {expenseResult.error && <div className="notice detail-section" role="alert"><span>{expenseResult.error}</span></div>}
    </>
  );
}
