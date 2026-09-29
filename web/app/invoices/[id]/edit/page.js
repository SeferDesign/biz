import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import { browserApiBaseUrl, getApiData } from '../../../../lib/api.js';
import { invoiceFields } from '../../../../lib/record-fields.js';

export default async function EditInvoicePage({ params }) {
  const { id } = await params;
  const [invoiceResult, clientResult] = await Promise.all([
    getApiData(`/v1/invoices/${encodeURIComponent(id)}`),
    getApiData('/v1/clients')
  ]);
  if (invoiceResult.status === 404) notFound();
  if (invoiceResult.error) return <div className="notice" role="alert"><strong>Invoice unavailable</strong><span>{invoiceResult.error}</span></div>;
  return <RecordForm title={`Edit Invoice ${String(invoiceResult.data.id).padStart(4, '0')}`} description="Update the client, amount, or payment status." fields={invoiceFields(clientResult.data || [])} initialValues={invoiceResult.data} endpoint={`${browserApiBaseUrl}/v1/invoices/${invoiceResult.data.id}`} method="PATCH" returnTo={`/invoices/${invoiceResult.data.id}`} submitLabel="Save Changes" />;
}
