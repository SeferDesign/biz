import Notice from '../../../../components/Notice.js';
import RecordForm from '../../../../components/RecordForm.js';
import { getApiData } from '../../../../lib/api-server.js';
import { browserApiBaseUrl } from '../../../../lib/api.js';
import { invoiceTemplateFields } from '../../../../lib/record-fields.js';

export const metadata = { title: 'New Invoice Template' };

export default async function NewInvoiceTemplatePage() {
  const clientsResult = await getApiData('/clients');
  if (clientsResult.error) return <Notice title="Clients unavailable">{clientsResult.error}</Notice>;

  return (
    <RecordForm
      title="New Invoice Template"
      description="Create a reusable invoice description for every client or a specific client."
      fields={invoiceTemplateFields(clientsResult.data || [])}
      endpoint={`${browserApiBaseUrl}/invoice-templates`}
      returnTo="/settings/templates"
      createdRecordHref="/settings/templates/:id/edit"
      submitLabel="Create template"
    />
  );
}
