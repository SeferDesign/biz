import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage, StatusLabel } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import InvoiceEmailPanel from '../../../components/InvoiceEmailPanel.js';
import { browserApiBaseUrl, formatDate, formatMoney, invoiceStatus, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function InvoiceDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const accessToken = typeof query?.access_token === 'string' ? query.access_token : '';
  const accessTokenQuery = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : '';
  const [invoiceResult, lineResult, emailSendsResult] = await Promise.all([
    getApiData(`/invoices/${encodeURIComponent(id)}${accessTokenQuery}`),
    getApiData(`/invoices/${encodeURIComponent(id)}/lines${accessTokenQuery}`),
    accessToken ? Promise.resolve({ data: [] }) : getApiData(`/invoices/${encodeURIComponent(id)}/email-sends`)
  ]);
  if (invoiceResult.status === 404) notFound();
  if (invoiceResult.error) {
    return <div className="notice" role="alert"><strong>Invoice unavailable</strong><span>{invoiceResult.error}</span></div>;
  }

  const invoice = invoiceResult.data;
  const lines = lineResult.data || [];
  return (
    <>
      {!accessToken && <Link className="back-link" href="/invoices">&lt; All invoices</Link>}
      <div className="page-heading">
        <div><p className="eyebrow">INVOICE / {String(invoice.id).padStart(4, '0')}</p><h1>{invoice.description || 'Invoice details'}</h1><p className="page-description">Issued {formatDate(invoice.date)}</p></div>
        <div className="detail-actions">
          <StatusLabel status={invoiceStatus(invoice)} />
          <a className="secondary-button" href={`${browserApiBaseUrl}/invoices/${invoice.id}/pdf${accessTokenQuery}`}>Download PDF</a>
          {!accessToken && <ResourceActions editHref={`/invoices/${invoice.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/invoices/${invoice.id}`} returnTo="/invoices" label="invoice" />}
        </div>
      </div>
      <DetailGrid items={[
        ['Amount', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
        ['Client', accessToken ? `Client ${invoice.client_id}` : <Link href={`/clients/${invoice.client_id}`} key="client">Client {invoice.client_id}</Link>],
        ['Payment type', invoice.paymenttype],
        ['Issue date', formatDate(invoice.date)],
        ['Paid date', formatDate(invoice.paiddate)],
        ['Description', invoice.description]
      ]} />
      {!accessToken && <InvoiceEmailPanel invoiceId={invoice.id} initialSends={emailSendsResult.data || []} historyError={emailSendsResult.error} />}
      <section className="detail-section">
        <div className="section-heading"><h2>Line items</h2><span className="section-note">{lines.length} items</span></div>
        {lineResult.error ? <div className="notice" role="alert"><span>{lineResult.error}</span></div> : (
          <ResourcePage
            hideHeading
            data={lines}
            pageHref={`/invoices/${invoice.id}${accessTokenQuery}`}
            page={parsePage(query?.page)}
            columns={[
              { key: 'description', label: 'Description' },
              { key: 'hours', label: 'Hours', render: (line) => line.hours ?? '-' },
              { key: 'rate', label: 'Rate', className: 'numeric-cell', render: (line) => line.rate ? formatMoney(line.rate) : '-' },
              { key: 'total', label: 'Line total', className: 'numeric-cell', render: (line) => formatMoney(line.total ?? line.amount, invoice.currency) }
            ]}
          />
        )}
      </section>
    </>
  );
}
