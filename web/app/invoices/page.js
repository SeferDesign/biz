import Link from 'next/link';
import { ResourcePage, StatusLabel } from '../../components/ResourcePage.js';
import { formatDate, formatMoney, invoiceStatus, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export default async function InvoicesPage({ searchParams }) {
  const params = await searchParams;
  const [invoiceResult, clientResult] = await Promise.all([
    getApiData('/invoices'),
    getApiData('/clients')
  ]);
  const clientsById = new Map((clientResult.data || []).map((client) => [client.id, client]));

  return (
    <ResourcePage
      eyebrow="BILLING / INVOICES"
      title="Invoices"
      description="Issued invoices, payment status, and client billing history."
      data={invoiceResult.data}
      error={invoiceResult.error || clientResult.error}
      countLabel="invoices"
      actionHref="/invoices/new"
      actionLabel="New Invoice"
      pageHref="/invoices"
      page={parsePage(params?.page)}
      columns={[
        { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>INV-{String(invoice.id).padStart(4, '0')}</Link> },
        { key: 'client', label: 'Client', render: (invoice) => {
          const client = clientsById.get(invoice.client_id);
          return client ? <Link className="table-link" href={`/clients/${client.id}`}>{client.name}</Link> : `Client ${invoice.client_id || '-'}`;
        } },
        { key: 'date', label: 'Issue date', render: (invoice) => formatDate(invoice.date) },
        { key: 'status', label: 'Status', render: (invoice) => <StatusLabel status={invoiceStatus(invoice)} /> },
        { key: 'paiddate', label: 'Paid date', render: (invoice) => formatDate(invoice.paiddate) },
        { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) }
      ]}
    />
  );
}
