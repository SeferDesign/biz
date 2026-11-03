import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import { NewIconButton } from '../../components/NewButton.js';
import { formatMoney, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export const metadata = { title: 'Vendors' };

export default async function VendorsPage({ searchParams }) {
  const params = await searchParams;
  const page = parsePage(params?.page);
  const vendorResult = await getApiData(`/vendors?page=${page}`);

  return (
    <ResourcePage
      title="Vendors"
      data={vendorResult.data?.items}
      total={vendorResult.data?.total}
      error={vendorResult.error}
      countLabel="vendors"
      actionHref="/vendors/new"
      actionLabel="New Vendor"
      pageHref="/vendors"
      page={page}
      columns={[
        { key: 'name', label: 'Name', render: (vendor) => <Link className="table-link" href={`/vendors/${vendor.id}`}>{vendor.name}</Link> },
        { key: 'category', label: 'Category' },
        { key: 'expenses', label: 'Expense records', className: 'numeric-cell', render: (vendor) => vendor.expense_count || 0 },
        { key: 'amount', label: 'Recorded spend', className: 'numeric-cell', render: (vendor) => formatMoney(vendor.expense_total || 0) },
        {
          key: 'expense_action',
          label: 'New expense',
          className: 'action-cell',
          render: (vendor) => <NewIconButton href={`/expenses/new?vendor_id=${encodeURIComponent(vendor.id)}`} label={`Create new expense for ${vendor.name || 'this vendor'}`} />
        }
      ]}
    />
  );
}
