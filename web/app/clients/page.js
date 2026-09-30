import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import { formatMoney, getApiData, parsePage } from '../../lib/api.js';

export default async function ClientsPage({ searchParams }) {
  const params = await searchParams;
  const result = await getApiData('/clients');
  return (
    <ResourcePage
      eyebrow="DIRECTORY / CLIENTS"
      title="Clients"
      description="Client contacts and billing details."
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
        { key: 'location', label: 'Location', render: (client) => [client.city, client.state].filter(Boolean).join(', ') || '-' },
        { key: 'rate', label: 'Hourly rate', className: 'numeric-cell', render: (client) => client.currentrate ? formatMoney(client.currentrate) : '-' }
      ]}
    />
  );
}
