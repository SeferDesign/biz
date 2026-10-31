import { notFound } from 'next/navigation';
import Notice from '../../../../../components/Notice.js';
import RecordForm from '../../../../../components/RecordForm.js';
import { browserApiBaseUrl } from '../../../../../lib/api.js';
import { getApiData } from '../../../../../lib/api-server.js';
import { invoiceTemplateFields } from '../../../../../lib/record-fields.js';
import { Card, CardContent } from '../../../../../components/ui/card.js';

export const metadata = { title: 'Edit Invoice Template' };

export default async function EditInvoiceTemplatePage({ params }) {
  const { id } = await params;
  const [templatesResult, clientsResult] = await Promise.all([
    getApiData('/invoice-templates'),
    getApiData('/clients')
  ]);
  if (templatesResult.error) return <Notice title="Invoice templates unavailable">{templatesResult.error}</Notice>;
  if (clientsResult.error) return <Notice title="Clients unavailable">{clientsResult.error}</Notice>;

  const template = (templatesResult.data || []).find((item) => String(item.id) === String(id));
  if (!template) notFound();

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardContent className="pt-6">
        <RecordForm
          title="Edit Invoice Template"
          description={`Update the reusable description “${template.name}”.`}
          fields={invoiceTemplateFields(clientsResult.data || [])}
          initialValues={template}
          endpoint={`${browserApiBaseUrl}/invoice-templates/${template.id}`}
          method="PATCH"
          returnTo="/settings/templates"
          submitLabel="Save changes"
        />
      </CardContent>
    </Card>
  );
}
