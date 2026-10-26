import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';
import { invoiceFields } from '../../../lib/record-fields.js';

export default async function NewInvoicePage({ searchParams }) {
  const params = await searchParams;
  const result = await getApiData('/clients');
  const clients = result.data || [];
  const requestedClientId = Number(params?.client_id);
  const initialClientId = clients.some((client) => Number(client.id) === requestedClientId)
    ? requestedClientId
    : (clients[0]?.id ?? '');
  return <RecordForm title="New Invoice" description="Create a client invoice with billing details and line items." fields={invoiceFields(clients)} initialValues={{ client_id: initialClientId, date: new Date().toISOString().slice(0, 10), currency: 'USD', status: 'draft' }} endpoint={`${browserApiBaseUrl}/invoices`} lineItemsEndpoint={`${browserApiBaseUrl}/invoices/:id/lines`} emailEndpoint={`${browserApiBaseUrl}/invoices/:id/email`} lineItemsEnabled returnTo="/invoices" submitLabel="Create Invoice" />;
}
