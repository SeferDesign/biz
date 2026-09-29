import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl, getApiData } from '../../../lib/api.js';
import { yearFields } from '../../../lib/record-fields.js';

export default async function NewYearPage() {
  const result = await getApiData('/years/new');
  return <RecordForm title="New financial year" description="Set a tax rate and annual and monthly income goals." fields={yearFields} initialValues={result.data?.year || { goals_months: Array(12).fill(0) }} endpoint={`${browserApiBaseUrl}/years`} returnTo="/years" submitLabel="Create year" />;
}
