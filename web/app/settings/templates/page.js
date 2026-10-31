import InvoiceTemplatesIndex from '../../../components/InvoiceTemplatesIndex.js';
import Notice from '../../../components/Notice.js';
import { getApiData } from '../../../lib/api-server.js';

export const metadata = { title: 'Invoice Templates' };

export default async function InvoiceTemplatesPage() {
  const [templatesResult, clientsResult] = await Promise.all([
    getApiData('/invoice-templates'),
    getApiData('/clients')
  ]);
  if (templatesResult.error) return <Notice title="Invoice templates unavailable">{templatesResult.error}</Notice>;
  if (clientsResult.error) return <Notice title="Clients unavailable">{clientsResult.error}</Notice>;
  return <InvoiceTemplatesIndex initialTemplates={templatesResult.data || []} clients={clientsResult.data || []} />;
}
