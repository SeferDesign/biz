import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage, StatusLabel } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import InvoiceActions from '../../../components/InvoiceActions.js';
import InvoiceEmailPanel from '../../../components/InvoiceEmailPanel.js';
import InvoicePayment from '../../../components/InvoicePayment.js';
import ClientLinkPanel from '../../../components/ClientLinkPanel.js';
import { browserApiBaseUrl, formatDate, formatDateTime, formatMoney, invoiceStatus, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function InvoiceDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const accessToken = typeof query?.access_token === 'string' ? query.access_token : '';
  const accessTokenQuery = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : '';
  const checkoutSessionId = typeof query?.checkout_session_id === 'string' ? query.checkout_session_id : '';
  const paymentResult = checkoutSessionId
    ? await getApiData(`/invoices/${encodeURIComponent(id)}/stripe?session_id=${encodeURIComponent(checkoutSessionId)}${accessToken ? `&access_token=${encodeURIComponent(accessToken)}` : ''}`)
    : null;
  const [invoiceResult, lineResult, emailSendsResult, paymentOptionsResult, paymentsResult] = await Promise.all([
    getApiData(`/invoices/${encodeURIComponent(id)}${accessTokenQuery}`),
    getApiData(`/invoices/${encodeURIComponent(id)}/lines${accessTokenQuery}`),
    accessToken ? Promise.resolve({ data: [] }) : getApiData(`/invoices/${encodeURIComponent(id)}/email-sends`),
    accessToken ? getApiData(`/invoices/${encodeURIComponent(id)}/payment-options${accessTokenQuery}`) : Promise.resolve({}),
    accessToken ? Promise.resolve({ data: [] }) : getApiData(`/invoices/${encodeURIComponent(id)}/payments`)
  ]);
  if (invoiceResult.status === 404) notFound();
  if (invoiceResult.error) {
    return <div className="notice" role="alert"><strong>Invoice unavailable</strong><span>{invoiceResult.error}</span></div>;
  }

  const invoice = invoiceResult.data;
  const lines = lineResult.data || [];
  const paymentOptions = paymentOptionsResult.data;
  const paymentStatus = paymentResult?.data?.status;
  const payments = paymentsResult.data || [];
  const isPaid = invoice.paid === true || invoice.paid === 1 || invoice.status === 'paid';
  const billedTo = invoice.client;
  const billedToAddress = billedTo && [billedTo.address1, billedTo.address2, [billedTo.city, billedTo.state, billedTo.zipcode].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
  const detailItems = accessToken
    ? [
      [isPaid ? 'Amount' : 'Amount due', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
      ['Billed to', billedTo?.name],
      ['Issue date', formatDate(invoice.date)],
      ...(billedToAddress ? [['Address', billedToAddress]] : []),
      ...(isPaid ? [['Paid date', formatDate(invoice.paiddate)], ['Payment method', invoice.paymenttype]] : [])
    ]
    : [
      ['Amount', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
      ['Client', <Link href={`/clients/${invoice.client_id}`} key="client">Client {invoice.client_id}</Link>],
      ['Payment type', invoice.paymenttype],
      ['Issue date', formatDate(invoice.date)],
      ['Paid date', formatDate(invoice.paiddate)],
      ['Description', invoice.description]
    ];
  return (
    <>
      {paymentResult && (
        <div className={`notice${paymentStatus === 'paid' || paymentStatus === 'processing' ? ' notice-success' : ''}`} role="status">
          {paymentStatus === 'paid' && <><strong>Payment received</strong><span>Thank you. This invoice has been paid.</span></>}
          {paymentStatus === 'processing' && <><strong>Payment processing</strong><span>Your bank payment was submitted and usually clears within a few business days.</span></>}
          {paymentStatus !== 'paid' && paymentStatus !== 'processing' && <><strong>Payment not completed</strong><span>{paymentResult.error || 'The payment was not completed. You can try again below.'}</span></>}
        </div>
      )}
      {!paymentResult && accessToken && paymentOptions?.processing && (
        <div className="notice notice-success" role="status"><strong>Payment processing</strong><span>Your bank payment was submitted and usually clears within a few business days.</span></div>
      )}
      {query?.checkout === 'canceled' && !isPaid && (
        <div className="notice" role="status"><strong>Payment canceled</strong><span>You were not charged. You can choose a payment method below to try again.</span></div>
      )}
      {!accessToken && <Link className="back-link" href="/invoices">&lt; All invoices</Link>}
      <div className="page-heading">
        <div><p className="eyebrow">INVOICE / {String(invoice.id).padStart(4, '0')}</p><h1>{invoice.description || 'Invoice details'}</h1><p className="page-description">Issued {formatDate(invoice.date)}</p></div>
        <div className="detail-actions">
          {accessToken ? <StatusLabel status={invoiceStatus(invoice)} /> : <InvoiceActions key={`${invoice.id}-${invoiceStatus(invoice)}`} invoice={invoice} lines={lines} linesAvailable={!lineResult.error} />}
          <a className="secondary-button" href={`${browserApiBaseUrl}/invoices/${invoice.id}/pdf${accessTokenQuery}`}>Download PDF</a>
          {!accessToken && <ResourceActions editHref={`/invoices/${invoice.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/invoices/${invoice.id}`} returnTo="/invoices" label="invoice" />}
        </div>
      </div>
      <DetailGrid items={detailItems} />
      {!accessToken && <ClientLinkPanel invoiceId={invoice.id} initialAccessToken={invoice.access_token} />}
      {!accessToken && payments.length > 0 && (
        <section className="detail-section">
          <div className="section-heading"><h2>Online payments</h2><span className="section-note">{payments.length} via Stripe</span></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Submitted</th><th>Method</th><th>Status</th><th>Completed</th><th className="numeric-cell">Amount</th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="primary-cell">{formatDateTime(payment.submitted_at)}</td>
                    <td>{payment.method === 'us_bank_account' ? 'ACH' : payment.method === 'card' ? 'Card' : payment.method || '-'}</td>
                    <td><StatusLabel status={payment.status} />{payment.failure_message && <span className="section-note"> {payment.failure_message}</span>}</td>
                    <td>{formatDateTime(payment.completed_at)}</td>
                    <td className="numeric-cell">{formatMoney(payment.amount, payment.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!accessToken && <InvoiceEmailPanel invoiceId={invoice.id} initialSends={emailSendsResult.data || []} historyError={emailSendsResult.error} />}
      {paymentOptions?.enabled && paymentStatus !== 'processing' && (
        <InvoicePayment
          invoiceId={invoice.id}
          accessToken={accessToken}
          methods={paymentOptions.methods}
          currency={paymentOptions.currency}
        />
      )}
      {accessToken && !isPaid && (
        <p className="section-note payment-alternatives">Prefer to pay another way? See <Link className="inline-link" href="/payments">all payment options</Link>.</p>
      )}
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
