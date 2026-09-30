import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';
import { expenseFields } from '../../../lib/record-fields.js';

export default async function NewExpensePage() {
  const result = await getApiData('/vendors');
  return <RecordForm title="New expense" description="Record a business expense and its vendor." fields={expenseFields(result.data || [])} initialValues={{ date: new Date().toISOString().slice(0, 10), cost: '' }} endpoint={`${browserApiBaseUrl}/expenses`} returnTo="/expenses" submitLabel="Create expense" />;
}
