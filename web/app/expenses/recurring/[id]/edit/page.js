import { notFound } from 'next/navigation';
import Notice from '../../../../../components/Notice.js';
import RecordForm from '../../../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../../../lib/api.js';
import { getApiData } from '../../../../../lib/api-server.js';
import { recurringExpenseFields } from '../../../../../lib/record-fields.js';

export const metadata = { title: 'Edit Recurring Expense' };

export default async function EditRecurringExpensePage({ params }) {
  const { id } = await params;
  const [ruleResult, vendorResult] = await Promise.all([
    getApiData(`/recurring-expenses/${encodeURIComponent(id)}`),
    getApiData('/vendors')
  ]);
  if (ruleResult.status === 404) notFound();
  if (ruleResult.error) return <Notice title="Recurring expense unavailable">{ruleResult.error}</Notice>;
  return (
    <RecordForm
      title="Edit recurring expense"
      description="Update the rule and its next planned occurrence."
      fields={recurringExpenseFields(vendorResult.data || [])}
      initialValues={ruleResult.data}
      endpoint={`${browserApiBaseUrl}/recurring-expenses/${ruleResult.data.id}`}
      method="PATCH"
      returnTo="/expenses/recurring"
      submitLabel="Save recurring expense"
    />
  );
}
