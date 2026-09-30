import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl, getApiData } from '../../../lib/api.js';
import { invoiceFields } from '../../../lib/record-fields.js';

export default async function NewInvoicePage() {
  const result = await getApiData('/clients');
  const clients = result.data || [];
  return <RecordForm title="New Invoice" description="Create a client invoice with billing details and line items." fields={invoiceFields(clients)} initialValues={{ client_id: clients[0]?.id ?? '', date: new Date().toISOString().slice(0, 10), currency: 'USD', status: 'draft' }} endpoint={`${browserApiBaseUrl}/invoices`} lineItemsEndpoint={`${browserApiBaseUrl}/invoices/:id/lines`} lineItemsEnabled returnTo="/invoices" submitLabel="Create Invoice" />;
}
