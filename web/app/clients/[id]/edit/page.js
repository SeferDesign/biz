import Link from 'next/link';
import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import { browserApiBaseUrl, getApiData } from '../../../../lib/api.js';
import { clientFields } from '../../../../lib/record-fields.js';

export default async function EditClientPage({ params }) {
  const { id } = await params;
  const result = await getApiData(`/v1/clients/${encodeURIComponent(id)}`);
  if (result.status === 404) notFound();
  if (result.error) return <div className="notice" role="alert"><strong>Client unavailable</strong><span>{result.error}</span></div>;
  return <RecordForm title="Edit Client" description="Update this client’s contact and billing details." fields={clientFields} initialValues={result.data} endpoint={`${browserApiBaseUrl}/v1/clients/${result.data.id}`} method="PATCH" returnTo={`/clients/${result.data.id}`} submitLabel="Save Changes" />;
}
