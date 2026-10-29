import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage, StatusBadge } from '../../../components/ResourcePage.js';
import NewButton from '../../../components/NewButton.js';
import ResourceActions from '../../../components/ResourceActions.js';
import ClientPortalLinkPanel from '../../../components/ClientPortalLinkPanel.js';
import Notice from '../../../components/Notice.js';
import { browserApiBaseUrl, formatDate, formatMoney, invoiceStatus, newestInvoicesFirst, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function ClientDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const accessToken = typeof query?.access_token === 'string' ? query.access_token : '';
  const accessTokenQuery = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : '';
  const [clientResult, invoiceResult] = await Promise.all([
    getApiData(`/clients/${encodeURIComponent(id)}${accessTokenQuery}`),
    getApiData(accessToken ? `/clients/${encodeURIComponent(id)}/invoices${accessTokenQuery}` : '/invoices')
  ]);
  if (clientResult.status === 404) notFound();
  if (clientResult.error) {
    return <Notice title="Client unavailable">{clientResult.error}</Notice>;
  }

  const client = clientResult.data;
  const invoices = (invoiceResult.data || [])
    .filter((invoice) => accessToken || Number(invoice.client_id) === Number(client.id))
    .sort(newestInvoicesFirst);
  const outstandingByCurrency = new Map();
  for (const invoice of invoices) {
    if (invoice.status === 'draft' || invoice.paid || invoice.status === 'paid') continue;
    const currency = invoice.currency || 'USD';
    outstandingByCurrency.set(currency, (outstandingByCurrency.get(currency) || 0) + Number(invoice.cost ?? invoice.total ?? 0));
  }
  const outstandingBalance = [...outstandingByCurrency]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' · ') || formatMoney(0);
  const address = [client.address1, client.address2, [client.city, client.state, client.zipcode].filter(Boolean).join(' ')].filter(Boolean).join('\n');
	const billingEmails = [client.email_accounting, client.email_accounting_2, client.email_accounting_3, client.email]
	.filter((value, index, all) => value && all.indexOf(value) === index);
  const billingEmailsDisplay = billingEmails.join(', ');

  return (
    <>
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
        [`Billing email${billingEmails.length > 1 ? 's' : ''}`, billingEmailsDisplay],
        ['Website', client.site_url ? <a href={client.site_url} rel="noreferrer" target="_blank">{client.site_url}</a> : '-'],
        ['Address', address ? <address className="detail-address">{address}</address> : null],
        ['Outstanding balance', outstandingBalance],
        ...(accessToken ? [] : [
          ['Preferred payment', client.preferred_paymenttype],
          ['Payment terms', client.payment_terms || 'Net 15'],
          ['Current rate', client.currentrate ? formatMoney(client.currentrate) : '-']
        ])
      ]} />
      {!accessToken && <ClientPortalLinkPanel clientId={client.id} initialAccessToken={client.access_token} />}
      <section className="detail-section">
        <div className="section-heading"><h2>Invoices</h2></div>
        {invoiceResult.error ? <Notice>{invoiceResult.error}</Notice> : (
          <ResourcePage
            hideHeading
            data={invoices}
            pageHref={`/clients/${client.id}${accessTokenQuery}`}
            page={parsePage(query?.page)}
            columns={[
              { key: 'id', label: 'Invoice', render: (invoice) => <Link className="table-link" href={`/invoices/${invoice.id}${accessTokenQuery}`}>{invoice.display_id || invoice.display_id_number || invoice.id}</Link> },
              { key: 'date', label: 'Date', render: (invoice) => formatDate(invoice.date) },
              { key: 'description', label: 'Description' },
              { key: 'status', label: 'Status', render: (invoice) => <StatusBadge status={invoiceStatus(invoice)} /> },
              { key: 'cost', label: 'Amount', className: 'numeric-cell', render: (invoice) => formatMoney(invoice.cost ?? invoice.total, invoice.currency) }
            ]}
          />
        )}
      </section>
    </>
  );
}
