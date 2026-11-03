import RecordForm from '../../../../components/RecordForm.js';
import Notice from '../../../../components/Notice.js';
import { browserApiBaseUrl } from '../../../../lib/api.js';
import { getApiData } from '../../../../lib/api-server.js';
import { recurringExpenseFields } from '../../../../lib/record-fields.js';

export const metadata = { title: 'New Recurring Expense' };

export default async function NewRecurringExpensePage() {
  const result = await getApiData('/vendors');
  if (result.error) return <Notice title="Recurring expenses unavailable">{result.error}</Notice>;
  return (
    <RecordForm
      title="New recurring expense"
      description="Create a planned occurrence that becomes an actual expense automatically on its date."
      fields={recurringExpenseFields(result.data || [])}
      initialValues={{
        start_date: new Date().toISOString().slice(0, 10),
        cost: '',
        account: 'Business',
        interval_count: 1,
        interval_unit: 'month'
      }}
      endpoint={`${browserApiBaseUrl}/recurring-expenses`}
      returnTo="/expenses/recurring"
      submitLabel="Create recurring expense"
    />
  );
}
