import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import { NewIconButton } from '../../components/NewButton.js';
import { formatMoney, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export default async function ClientsPage({ searchParams }) {
  const params = await searchParams;
  const result = await getApiData('/clients');
  return (
    <ResourcePage
      title="Clients"
      data={result.data}
      error={result.error}
      countLabel="clients"
      actionHref="/clients/new"
      actionLabel="New Client"
      pageHref="/clients"
      page={parsePage(params?.page)}
      columns={[
        { key: 'name', label: 'Company', render: (client) => <Link className="table-link" href={`/clients/${client.id}`}>{client.name || 'Unnamed client'}</Link> },
        { key: 'contact', label: 'Contact' },
        { key: 'email', label: 'Billing email', render: (client) => client.email_accounting || client.email || '-' },
        { key: 'rate', label: 'Hourly rate', className: 'numeric-cell', render: (client) => client.currentrate ? formatMoney(client.currentrate) : '-' },
        {
          key: 'invoice_action',
          label: 'New invoice',
          className: 'action-cell',
          render: (client) => <NewIconButton href={`/invoices/new?client_id=${encodeURIComponent(client.id)}`} label={`Create new invoice for ${client.name || 'this client'}`} />
        }
      ]}
    />
  );
}
