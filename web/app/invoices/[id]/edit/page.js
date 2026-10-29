import { notFound } from 'next/navigation';
import RecordForm from '../../../../components/RecordForm.js';
import Notice from '../../../../components/Notice.js';
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
  if (invoiceResult.error) return <Notice title="Invoice unavailable">{invoiceResult.error}</Notice>;
  if (linesResult.error) return <Notice title="Invoice lines unavailable">{linesResult.error}</Notice>;
  return <RecordForm title={`Edit Invoice ${invoiceResult.data.display_id_number || invoiceResult.data.id}`} description="Update billing details, line items, or payment status." fields={invoiceFields(clientResult.data || [])} initialValues={invoiceResult.data} initialLines={linesResult.data || []} endpoint={`${browserApiBaseUrl}/invoices/${invoiceResult.data.id}`} lineItemsEndpoint={`${browserApiBaseUrl}/invoices/:id/lines`} emailEndpoint={`${browserApiBaseUrl}/invoices/:id/email`} lineItemsEnabled method="PATCH" returnTo={`/invoices/${invoiceResult.data.id}`} submitLabel="Save Changes" />;
}
