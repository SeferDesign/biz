import Link from 'next/link';
import { ResourcePage } from '../../../components/ResourcePage.js';
import RecurringRuleActions from '../../../components/RecurringRuleActions.js';
import DeleteButton from '../../../components/DeleteButton.js';
import { Badge } from '../../../components/ui/badge.js';
import { browserApiBaseUrl, formatMoney, formatTableDate } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export const metadata = { title: 'Recurring Expenses' };

function frequencyLabel(rule) {
  const unit = { week: 'week', month: 'month', year: 'year' }[rule.interval_unit] || rule.interval_unit;
  return `Every ${rule.interval_count} ${unit}${Number(rule.interval_count) === 1 ? '' : 's'}`;
}

export default async function RecurringExpensesPage() {
  const [rulesResult, vendorsResult] = await Promise.all([
    getApiData('/recurring-expenses'),
    getApiData('/vendors')
  ]);
  const vendorsById = new Map((vendorsResult.data || []).map((vendor) => [Number(vendor.id), vendor]));

  return (
    <ResourcePage
      title="Recurring expenses"
      description="Manage expenses that are scheduled automatically."
      data={rulesResult.data}
      error={rulesResult.error || vendorsResult.error}
      countLabel="recurring expenses"
      actionHref="/expenses/recurring/new"
      actionLabel="New recurring expense"
      columns={[
        { key: 'name', label: 'Expense', render: (rule) => <Link className="table-link" href={`/expenses/recurring/${rule.id}/edit`}>{rule.name}</Link> },
        { key: 'vendor', label: 'Vendor', render: (rule) => vendorsById.get(Number(rule.vendor_id))?.name || '-' },
        { key: 'frequency', label: 'Frequency', render: frequencyLabel },
        { key: 'next_date', label: 'Next date', className: 'date-cell', render: (rule) => rule.next_date ? formatTableDate(rule.next_date) : '—' },
        { key: 'cost', label: 'Cost', className: 'numeric-cell', render: (rule) => formatMoney(rule.cost) },
        { key: 'status', label: 'Status', render: (rule) => <Badge variant={rule.active ? 'success' : 'secondary'}>{rule.active ? 'Active' : 'Paused'}</Badge> },
        { key: 'actions', label: 'Actions', className: 'action-cell', render: (rule) => (
          <div className="flex flex-wrap items-center gap-2">
            {rule.next_date
              ? <RecurringRuleActions id={rule.id} active={Boolean(rule.active)} />
              : <span className="text-muted-foreground">Ended</span>}
            <DeleteButton
              endpoint={`${browserApiBaseUrl}/recurring-expenses/${rule.id}`}
              returnTo="/expenses/recurring"
              label="Delete rule"
              description="This removes the rule and any future planned expenses. Past actual expenses are kept."
            />
          </div>
        ) }
      ]}
    />
  );
}
