import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../../lib/api.js';
import { getApiData } from '../../../../lib/api-server.js';
import { yearFields } from '../../../../lib/record-fields.js';

export default async function EditYearPage({ params }) {
  const { id } = await params;
  const result = await getApiData(`/years/${encodeURIComponent(id)}/edit`);
  if (result.status === 404) notFound();
  if (result.error) return <div className="notice" role="alert"><strong>Year unavailable</strong><span>{result.error}</span></div>;
  return <RecordForm title={`Edit ${result.data.year.year}`} description="Update the year’s tax rate and income goals." fields={yearFields} initialValues={result.data.year} endpoint={`${browserApiBaseUrl}/years/${result.data.year.id}`} method="PATCH" returnTo={`/years/${result.data.year.id}`} submitLabel="Save Changes" />;
}
