import Link from 'next/link';
import { ResourcePage, StatusBadge } from '../../components/ResourcePage.js';
import InvoiceActions from '../../components/InvoiceActions.js';
import { formatMoney, formatTableDate, invoiceStatus, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export const metadata = { title: 'Invoices' };

export default async function InvoicesPage({ searchParams }) {
  const params = await searchParams;
  const page = parsePage(params?.page);
  const invoiceResult = await getApiData(`/invoices?page=${page}`);

  return (
    <ResourcePage
      title="Invoices"
      data={invoiceResult.data?.items}
      total={invoiceResult.data?.total}
      error={invoiceResult.error}
      countLabel="invoices"
      actionHref="/invoices/new"
      actionLabel="New Invoice"
      pageHref="/invoices"
      page={page}
      columns={[
        { key: 'date', label: 'Invoice Date', className: 'date-cell', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>{formatTableDate(invoice.date)}</Link> },
        { key: 'id', label: 'Invoice ID', render: (invoice) => String(invoice.id) },
        { key: 'client', label: 'Client', render: (invoice) => {
          return invoice.client_name
            ? <Link className="table-link" href={`/clients/${invoice.client_id}`}>{invoice.client_name}</Link>
            : `Client ${invoice.client_id || '-'}`;
        } },
        { key: 'status', label: 'Status', render: (invoice) => <StatusBadge status={invoiceStatus(invoice)} /> },
        { key: 'paiddate', label: 'Paid date', className: 'date-cell', render: (invoice) => formatTableDate(invoice.paiddate) },
        { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) },
        { key: 'actions', label: 'Actions', render: (invoice) => <InvoiceActions invoice={invoice} compact /> }
      ]}
    />
  );
}
