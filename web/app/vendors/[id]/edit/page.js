import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../../lib/api.js';
import { getApiData } from '../../../../lib/api-server.js';
import { vendorFields } from '../../../../lib/record-fields.js';

export default async function EditVendorPage({ params }) {
  const { id } = await params;
  const result = await getApiData(`/vendors/${encodeURIComponent(id)}`);
  if (result.status === 404) notFound();
  if (result.error) return <div className="notice" role="alert"><strong>Vendor unavailable</strong><span>{result.error}</span></div>;
  return <RecordForm title="Edit vendor" description="Update supplier details and category." fields={vendorFields} initialValues={result.data} endpoint={`${browserApiBaseUrl}/vendors/${result.data.id}`} method="PATCH" returnTo={`/vendors/${result.data.id}`} submitLabel="Save Changes" />;
}
