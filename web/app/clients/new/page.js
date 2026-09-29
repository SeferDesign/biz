import RecordForm from '../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../lib/api.js';
import { clientFields } from '../../../lib/record-fields.js';

export default function NewClientPage() {
  return <RecordForm title="New Client" description="Add a client and their billing details." fields={clientFields} endpoint={`${browserApiBaseUrl}/v1/clients`} returnTo="/clients" submitLabel="Create Client" />;
}
