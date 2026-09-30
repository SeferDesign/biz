import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import { formatMoney, getApiData, parsePage } from '../../lib/api.js';

export default async function VendorsPage({ searchParams }) {
  const params = await searchParams;
  const [vendorResult, expenseResult] = await Promise.all([
    getApiData('/vendors'),
    getApiData('/expenses?inactive=true')
  ]);
  const totalsByVendor = new Map();
  for (const expense of expenseResult.data || []) {
    const totals = totalsByVendor.get(expense.vendor_id) || { count: 0, amount: 0 };
    totals.count += 1;
    totals.amount += Number(expense.cost || 0);
    totalsByVendor.set(expense.vendor_id, totals);
  }

  return (
    <ResourcePage
      eyebrow="DIRECTORY / VENDORS"
      title="Vendors"
      description="Suppliers and service providers associated with business expenses."
      data={vendorResult.data}
      error={vendorResult.error || expenseResult.error}
      countLabel="vendors"
      actionHref="/vendors/new"
      actionLabel="New Vendor"
      pageHref="/vendors"
      page={parsePage(params?.page)}
      columns={[
        { key: 'name', label: 'Vendor', render: (vendor) => <Link className="table-link" href={`/vendors/${vendor.id}`}>{vendor.name}</Link> },
        { key: 'category', label: 'Category' },
        { key: 'expenses', label: 'Expense records', render: (vendor) => totalsByVendor.get(vendor.id)?.count || 0 },
        { key: 'amount', label: 'Recorded spend', className: 'numeric-cell', render: (vendor) => formatMoney(totalsByVendor.get(vendor.id)?.amount || 0) },
        { key: 'notes', label: 'Notes' }
      ]}
    />
  );
}
