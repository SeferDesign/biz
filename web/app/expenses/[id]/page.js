import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, StatusBadge } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import { browserApiBaseUrl, formatDate, formatMoney } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';
import Notice from '../../../components/Notice.js';

export const metadata = { title: 'Expense Details' };

export default async function ExpenseDetailPage({ params }) {
  const { id } = await params;
  const [expenseResult, vendorResult] = await Promise.all([
    getApiData(`/expenses/${encodeURIComponent(id)}`),
    getApiData('/vendors')
  ]);
  if (expenseResult.status === 404) notFound();
  if (expenseResult.error) return <Notice title="Expense unavailable">{expenseResult.error}</Notice>;

  const expense = expenseResult.data;
  const [recurringRuleResult] = expense.is_planned && expense.recurring_rule_id
    ? await Promise.all([getApiData(`/recurring-expenses/${encodeURIComponent(expense.recurring_rule_id)}`)])
    : [null];
  const recurringRule = recurringRuleResult?.data;
  const planned = expense.is_planned === true || Number(expense.is_planned) === 1;
  const costDiffersFromRule = planned && recurringRule &&
    Math.round(Number(expense.cost) * 100) !== Math.round(Number(recurringRule.cost) * 100);
  const vendor = (vendorResult.data || []).find((item) => Number(item.id) === Number(expense.vendor_id));
  return (
    <>
      <div className="page-heading">
        <div><h1>{expense.name}</h1><p className="page-description">{formatDate(expense.date)}</p></div>
        <ResourceActions editHref={`/expenses/${expense.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/expenses/${expense.id}`} returnTo="/expenses" label="expense" />
      </div>
      {costDiffersFromRule && (
        <Notice title="Planned cost differs from recurring rule" variant="warning">
          This occurrence is {formatMoney(expense.cost)}; the current rule amount is {formatMoney(recurringRule.cost)}.
          This change applies to this occurrence only.{' '}
          <Link className="font-medium underline underline-offset-4" href={`/expenses/recurring/${recurringRule.id}/edit`}>
            Edit recurring rule
          </Link>
        </Notice>
      )}
      <DetailGrid items={[
        ['Cost', formatMoney(expense.cost)],
        ['Status', planned ? <StatusBadge status="planned" /> : 'Actual'],
        ['Vendor', vendor ? <Link href={`/vendors/${vendor.id}`} key="vendor">{vendor.name}</Link> : '-'],
        ['Account', expense.account],
        ['Date', formatDate(expense.date)],
        ['Notes', expense.notes]
      ]} />
    </>
  );
}
