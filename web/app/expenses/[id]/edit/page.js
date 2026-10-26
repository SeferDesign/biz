import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../../lib/api.js';
import { getApiData } from '../../../../lib/api-server.js';
import { expenseFields } from '../../../../lib/record-fields.js';

export default async function EditExpensePage({ params }) {
  const { id } = await params;
  const [expenseResult, vendorResult] = await Promise.all([
    getApiData(`/expenses/${encodeURIComponent(id)}`),
    getApiData('/vendors')
  ]);
  if (expenseResult.status === 404) notFound();
  if (expenseResult.error) return <div className="notice" role="alert"><strong>Expense unavailable</strong><span>{expenseResult.error}</span></div>;
  return <RecordForm title="Edit Expense" description="Update expense amount, date, or vendor." fields={expenseFields(vendorResult.data || [])} initialValues={expenseResult.data} endpoint={`${browserApiBaseUrl}/expenses/${expenseResult.data.id}`} method="PATCH" returnTo={`/expenses/${expenseResult.data.id}`} submitLabel="Save Changes" />;
}
