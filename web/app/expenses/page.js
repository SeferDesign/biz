import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import { formatDate, formatMoney, getApiData, parsePage } from '../../lib/api.js';

export default async function ExpensesPage({ searchParams }) {
  const params = await searchParams;
  const filter = ['inactive', 'future'].find((key) => params?.[key] === 'true');
  const endpoint = filter ? `/expenses?${filter}=true` : '/expenses';
  const [expenseResult, vendorResult] = await Promise.all([
    getApiData(endpoint),
    getApiData('/vendors')
  ]);
  const vendorsById = new Map((vendorResult.data || []).map((vendor) => [vendor.id, vendor]));

  return (
    <>
      <nav className="filter-row" aria-label="Expense date filter">
        <Link className="filter-link" href="/expenses" aria-current={!filter ? 'page' : undefined}>Recent</Link>
        <Link className="filter-link" href="/expenses?inactive=true" aria-current={filter === 'inactive' ? 'page' : undefined}>Past</Link>
        <Link className="filter-link" href="/expenses?future=true" aria-current={filter === 'future' ? 'page' : undefined}>Upcoming</Link>
        <Link className="filter-link" href="/expenses/bulk">Spreadsheet</Link>
      </nav>
      <ResourcePage
        eyebrow="EXPENSES"
        title="Expenses"
        description="Business spending by date, vendor, and account."
        data={expenseResult.data}
        error={expenseResult.error || vendorResult.error}
        countLabel="expenses"
        actionHref="/expenses/new"
        actionLabel="New expense"
        pageHref={filter ? `/expenses?${filter}=true` : '/expenses'}
        page={parsePage(params?.page)}
        columns={[
          { key: 'date', label: 'Date', render: (expense) => <Link className="table-link" href={`/expenses/${expense.id}`}>{formatDate(expense.date)}</Link> },
          { key: 'name', label: 'Expense' },
          { key: 'vendor', label: 'Vendor', render: (expense) => vendorsById.get(expense.vendor_id)?.name || '-' },
          { key: 'account', label: 'Account' },
          { key: 'cost', label: 'Cost', className: 'numeric-cell', render: (expense) => formatMoney(expense.cost) }
        ]}
      />
    </>
  );
}
