import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../../lib/api.js';
import { getApiData } from '../../../../lib/api-server.js';
import { invoiceFields } from '../../../../lib/record-fields.js';

export default async function EditInvoicePage({ params }) {
  const { id } = await params;
  const [invoiceResult, clientResult, linesResult] = await Promise.all([
    getApiData(`/invoices/${encodeURIComponent(id)}`),
    getApiData('/clients'),
    getApiData(`/invoices/${encodeURIComponent(id)}/lines`)
  ]);
  if (invoiceResult.status === 404) notFound();
  if (invoiceResult.error) return <div className="notice" role="alert"><strong>Invoice unavailable</strong><span>{invoiceResult.error}</span></div>;
  if (linesResult.error) return <div className="notice" role="alert"><strong>Invoice lines unavailable</strong><span>{linesResult.error}</span></div>;
  return <RecordForm title={`Edit Invoice ${String(invoiceResult.data.id).padStart(4, '0')}`} description="Update billing details, line items, or payment status." fields={invoiceFields(clientResult.data || [])} initialValues={invoiceResult.data} initialLines={linesResult.data || []} endpoint={`${browserApiBaseUrl}/invoices/${invoiceResult.data.id}`} lineItemsEndpoint={`${browserApiBaseUrl}/invoices/:id/lines`} emailEndpoint={`${browserApiBaseUrl}/invoices/:id/email`} lineItemsEnabled method="PATCH" returnTo={`/invoices/${invoiceResult.data.id}`} submitLabel="Save Changes" />;
}
