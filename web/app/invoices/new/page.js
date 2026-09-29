import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl, getApiData } from '../../../lib/api.js';
import { invoiceFields } from '../../../lib/record-fields.js';

export default async function NewInvoicePage() {
  const result = await getApiData('/v1/clients');
  return <RecordForm title="New Invoice" description="Create a client invoice and set its initial status." fields={invoiceFields(result.data || [])} initialValues={{ date: new Date().toISOString().slice(0, 10), currency: 'USD', status: 'draft' }} endpoint={`${browserApiBaseUrl}/v1/invoices`} returnTo="/invoices" submitLabel="Create Invoice" />;
}
