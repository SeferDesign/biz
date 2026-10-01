import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage } from '../../../components/ResourcePage.js';
import NewButton from '../../../components/NewButton.js';
import ResourceActions from '../../../components/ResourceActions.js';
import InvoiceActions from '../../../components/InvoiceActions.js';
import { browserApiBaseUrl, formatDate, formatMoney, newestInvoicesFirst, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function ClientDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const accessToken = typeof query?.access_token === 'string' ? query.access_token : '';
  const accessTokenQuery = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : '';
  const [clientResult, invoiceResult] = await Promise.all([
    getApiData(`/clients/${encodeURIComponent(id)}${accessTokenQuery}`),
    accessToken ? Promise.resolve({ data: [] }) : getApiData('/invoices')
  ]);
  if (clientResult.status === 404) notFound();
  if (clientResult.error) {
    return <div className="notice" role="alert"><strong>Client unavailable</strong><span>{clientResult.error}</span></div>;
  }

  const client = clientResult.data;
  const invoices = (invoiceResult.data || []).filter((invoice) => Number(invoice.client_id) === Number(client.id)).sort(newestInvoicesFirst);
  const address = [client.address1, client.address2, [client.city, client.state, client.zipcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return (
    <>
      {!accessToken && <Link className="back-link" href="/clients">&lt; All clients</Link>}
      <div className="page-heading">
        <div><h1>{client.name || 'Unnamed client'}</h1><p className="page-description">{client.contact || 'No primary contact listed'}</p></div>
        {!accessToken && (
          <div className="heading-actions">
            <NewButton href={`/invoices/new?client_id=${encodeURIComponent(client.id)}`} label="New Invoice" />
            <ResourceActions editHref={`/clients/${client.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/clients/${client.id}`} returnTo="/clients" label="client" />
          </div>
        )}
      </div>
      <DetailGrid items={[
        ['Contact', client.contact],
        ['Billing email', client.email_accounting || client.email],
        ...(!accessToken ? [
          ['Additional accounting email 1', client.email_accounting_2],
          ['Additional accounting email 2', client.email_accounting_3]
        ] : []),
        ['Website', client.site_url ? <a href={client.site_url} rel="noreferrer" target="_blank">{client.site_url}</a> : '-'],
        ['Address', address],
        ...(accessToken ? [] : [
          ['Preferred payment', client.preferred_paymenttype],
          ['Payment terms', client.payment_terms || 'Net 15'],
          ['Current rate', client.currentrate ? formatMoney(client.currentrate) : '-']
        ])
      ]} />
      {!accessToken && <section className="detail-section">
        <div className="section-heading"><h2>Invoices</h2><span className="section-note">{invoices.length} for this client</span></div>
        {invoiceResult.error ? <div className="notice" role="alert"><span>{invoiceResult.error}</span></div> : (
          <ResourcePage
            hideHeading
            data={invoices}
            pageHref={`/clients/${client.id}`}
            page={parsePage(query?.page)}
            columns={[
              { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}`}>INV-{String(invoice.id).padStart(4, '0')}</Link> },
              { key: 'date', label: 'Date', render: (invoice) => formatDate(invoice.date) },
              { key: 'description', label: 'Description' },
              { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) },
              { key: 'actions', label: 'Actions', render: (invoice) => <InvoiceActions invoice={invoice} compact /> }
            ]}
          />
        )}
      </section>}
    </>
  );
}
