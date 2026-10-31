import Link from 'next/link';
import NewButton from './NewButton.js';
import ResourceActions from './ResourceActions.js';
import { browserApiBaseUrl } from '../lib/api.js';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';

export default function InvoiceTemplatesIndex({ initialTemplates, clients }) {
  const templates = Array.isArray(initialTemplates) ? initialTemplates : [];
  const clientNames = new Map((clients || []).map((client) => [String(client.id), client.name]));
  const globalTemplates = templates
    .filter((template) => template.client_id == null)
    .sort((left, right) => left.name.localeCompare(right.name));
  const clientGroups = new Map();

  for (const template of templates) {
    if (template.client_id == null) continue;
    const clientId = String(template.client_id);
    clientGroups.set(clientId, [...(clientGroups.get(clientId) || []), template]);
  }

  const sortedClientGroups = [...clientGroups.entries()]
    .map(([clientId, clientTemplates]) => ({
      clientId,
      clientName: clientNames.get(clientId) || `Client ${clientId}`,
      templates: clientTemplates.sort((left, right) => left.name.localeCompare(right.name))
    }))
    .sort((left, right) => left.clientName.localeCompare(right.clientName));

  return (
    <div className="space-y-8">
      <header className="page-heading">
        <div>
          <h1>Invoice Templates</h1>
          <p className="page-description">Reusable descriptions for any client or a specific client.</p>
        </div>
        <div className="heading-actions">
          <NewButton href="/settings/templates/new" label="New template" />
        </div>
      </header>

      {templates.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No invoice templates yet</EmptyTitle>
            <EmptyDescription>Create a reusable description to insert while editing an invoice.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Global templates</CardTitle>
              <CardDescription>Available to every client.</CardDescription>
            </CardHeader>
            <CardContent>
              {globalTemplates.length ? (
                <TemplateTable templates={globalTemplates} />
              ) : (
                <p className="text-sm text-muted-foreground">No global templates.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client-specific templates</CardTitle>
              <CardDescription>{sortedClientGroups.length} {sortedClientGroups.length === 1 ? 'client' : 'clients'}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              {sortedClientGroups.length ? sortedClientGroups.map((group) => (
                <section className="grid gap-3" key={group.clientId}>
                  <h3 className="text-sm font-medium">{group.clientName}</h3>
                  <TemplateTable templates={group.templates} />
                </section>
              )) : (
                <p className="text-sm text-muted-foreground">No client-specific templates.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TemplateTable({ templates }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-1">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">
                <Link className="text-primary underline-offset-4 hover:underline" href={`/settings/templates/${template.id}/edit`}>
                  {template.name}
                </Link>
              </TableCell>
              <TableCell>
                <p className="m-0 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{template.description}</p>
              </TableCell>
              <TableCell>
                <ResourceActions
                  editHref={`/settings/templates/${template.id}/edit`}
                  deleteEndpoint={`${browserApiBaseUrl}/invoice-templates/${template.id}`}
                  returnTo="/settings/templates"
                  label="template"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
