import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { clientFields } from '../../../lib/record-fields.js';
import { getApiData } from '../../../lib/api-server.js';

export const metadata = { title: 'New Client' };

export default async function NewClientPage() {
  const clientsResult = await getApiData('/clients');
  const clients = Array.isArray(clientsResult.data) ? clientsResult.data : [];
  return <RecordForm title="New Client" description="Add a client and their billing details." fields={clientFields(clients)} endpoint={`${browserApiBaseUrl}/clients`} returnTo="/clients" createdRecordHref="/clients/:id" submitLabel="Create Client" />;
}
