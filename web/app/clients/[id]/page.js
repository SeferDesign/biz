import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import { browserApiBaseUrl, formatDate, formatMoney, getApiData, parsePage } from '../../../lib/api.js';

export default async function ClientDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const [clientResult, invoiceResult] = await Promise.all([
    getApiData(`/v1/clients/${encodeURIComponent(id)}`),
    getApiData('/v1/invoices')
  ]);
  if (clientResult.status === 404) notFound();
  if (clientResult.error) {
    return <div className="notice" role="alert"><strong>Client unavailable</strong><span>{clientResult.error}</span></div>;
  }

  const client = clientResult.data;
  const invoices = (invoiceResult.data || []).filter((invoice) => Number(invoice.client_id) === Number(client.id));
  const address = [client.address1, client.address2, [client.city, client.state, client.zipcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return (
    <>
      <Link className="back-link" href="/clients">&lt; All clients</Link>
      <div className="page-heading">
        <div><p className="eyebrow">CLIENT RECORD</p><h1>{client.name || 'Unnamed client'}</h1><p className="page-description">{client.contact || 'No primary contact listed'}</p></div>
        <ResourceActions editHref={`/clients/${client.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/v1/clients/${client.id}`} returnTo="/clients" label="client" />
      </div>
      <DetailGrid items={[
        ['Contact', client.contact],
        ['Billing email', client.email_accounting || client.email],
        ['Website', client.site_url ? <a href={client.site_url} rel="noreferrer" target="_blank">{client.site_url}</a> : '-'],
        ['Address', address],
        ['Preferred payment', client.preferred_paymenttype],
        ['Current rate', client.currentrate ? formatMoney(client.currentrate) : '-']
      ]} />
      <section className="detail-section">
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
              { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) }
            ]}
          />
        )}
      </section>
    </>
  );
}
