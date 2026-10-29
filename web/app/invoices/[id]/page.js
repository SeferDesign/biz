import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailGrid, ResourcePage, StatusBadge } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import InvoiceActions from '../../../components/InvoiceActions.js';
import InvoiceEmailPanel from '../../../components/InvoiceEmailPanel.js';
import InvoicePayment from '../../../components/InvoicePayment.js';
import ClientLinkPanel from '../../../components/ClientLinkPanel.js';
import Notice from '../../../components/Notice.js';
import { Button } from '../../../components/ui/button.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table.js';
import { browserApiBaseUrl, formatDate, formatDateTime, formatMoney, invoiceStatus, parsePage } from '../../../lib/api.js';
import { getApiData } from '../../../lib/api-server.js';

export default async function InvoiceDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const accessToken = typeof query?.access_token === 'string' ? query.access_token : '';
  const accessTokenQuery = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : '';
  const checkoutSessionId = typeof query?.checkout_session_id === 'string' ? query.checkout_session_id : '';
  const invoiceResult = await getApiData(`/invoices/${encodeURIComponent(id)}${accessTokenQuery}`);
  if (invoiceResult.status === 404) notFound();
  if (invoiceResult.error) {
    return <Notice title="Invoice unavailable">{invoiceResult.error}</Notice>;
  }

  const invoice = invoiceResult.data;
  const paymentResult = checkoutSessionId
    ? await getApiData(`/invoices/${encodeURIComponent(id)}/stripe?session_id=${encodeURIComponent(checkoutSessionId)}${accessToken ? `&access_token=${encodeURIComponent(accessToken)}` : ''}`)
    : null;
  const [lineResult, emailSendsResult, paymentOptionsResult, paymentsResult, clientResult] = await Promise.all([
    getApiData(`/invoices/${encodeURIComponent(id)}/lines${accessTokenQuery}`),
    accessToken ? Promise.resolve({ data: [] }) : getApiData(`/invoices/${encodeURIComponent(id)}/email-sends`),
    accessToken ? getApiData(`/invoices/${encodeURIComponent(id)}/payment-options${accessTokenQuery}`) : Promise.resolve({}),
    accessToken ? Promise.resolve({ data: [] }) : getApiData(`/invoices/${encodeURIComponent(id)}/payments`),
    accessToken ? Promise.resolve({ data: null }) : getApiData(`/clients/${encodeURIComponent(invoice.client_id)}`)
  ]);
  const clientName = clientResult?.data?.name || invoice.client?.name || `Client ${invoice.client_id || '-'}`;
  const lines = lineResult.data || [];
  const paymentOptions = paymentOptionsResult.data;
  const paymentStatus = paymentResult?.data?.status;
  const payments = paymentsResult.data || [];
  const isPaid = invoice.paid === true || invoice.paid === 1 || invoice.status === 'paid';
  const billedTo = invoice.client;
  const billedToAddress = billedTo && [billedTo.address1, billedTo.address2, [billedTo.city, billedTo.state, billedTo.zipcode].filter(Boolean).join(' ')]
    .filter(Boolean).join('\n');
  const detailItems = accessToken
    ? [
      [isPaid ? 'Amount' : 'Amount due', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
      ['Billed to', billedTo?.name],
      ['Issue date', formatDate(invoice.date)],
      ['Payment terms', billedTo?.payment_terms || 'Net 15'],
      ...(billedToAddress ? [['Address', <address className="detail-address">{billedToAddress}</address>]] : []),
      ...(isPaid ? [['Paid date', formatDate(invoice.paiddate)], ['Payment method', invoice.paymenttype]] : [])
    ]
    : [
      ['Amount', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
      ['Client', <Link href={`/clients/${invoice.client_id}`} key="client">{clientName}</Link>],
      ['Payment type', invoice.paymenttype],
      ['Issue date', formatDate(invoice.date)],
      ['Paid date', formatDate(invoice.paiddate)]
    ];
  return (
    <>
      {paymentResult && (
        <Notice
          className="mb-6"
          role="status"
          title={paymentStatus === 'paid' ? 'Payment received' : paymentStatus === 'processing' ? 'Payment processing' : 'Payment not completed'}
          variant={paymentStatus === 'paid' || paymentStatus === 'processing' ? 'success' : 'destructive'}
        >
          {paymentStatus === 'paid' ? 'Thank you. This invoice has been paid.' : paymentStatus === 'processing' ? 'Your bank payment was submitted and usually clears within a few business days.' : paymentResult.error || 'The payment was not completed. You can try again below.'}
        </Notice>
      )}
      {!paymentResult && accessToken && paymentOptions?.processing && (
        <Notice className="mb-6" role="status" title="Payment processing" variant="success">Your bank payment was submitted and usually clears within a few business days.</Notice>
      )}
      {query?.checkout === 'canceled' && !isPaid && (
        <Notice role="status" title="Payment canceled" variant="info">You were not charged. You can choose a payment method below to try again.</Notice>
      )}
      <div className="page-heading">
        <div><h1>Invoice #{invoice.id}</h1></div>
        <div className="detail-actions">
          {accessToken ? <StatusBadge status={invoiceStatus(invoice)} /> : <InvoiceActions key={`${invoice.id}-${invoiceStatus(invoice)}`} invoice={invoice} lines={lines} linesAvailable={!lineResult.error} />}
          <Button asChild variant="outline"><a href={`${browserApiBaseUrl}/invoices/${invoice.id}/pdf${accessTokenQuery}`}>Download PDF</a></Button>
          {!accessToken && <ResourceActions editHref={`/invoices/${invoice.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/invoices/${invoice.id}`} returnTo="/invoices" label="invoice" />}
        </div>
      </div>
      <DetailGrid items={detailItems} />
		<p className="invoice-description">{invoice.description}</p>
      {!accessToken && <ClientLinkPanel invoiceId={invoice.id} initialAccessToken={invoice.access_token} />}
      {!accessToken && payments.length > 0 && (
        <section className="detail-section">
          <div className="section-heading"><h2>Online payments</h2><span className="section-note">{payments.length} via Stripe</span></div>
          <div className="table-wrap">
            <Table className="data-table">
              <TableHeader><TableRow><TableHead>Submitted</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Completed</TableHead><TableHead className="numeric-cell">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="primary-cell">{formatDateTime(payment.submitted_at)}</TableCell>
                    <TableCell>{payment.method === 'us_bank_account' ? 'ACH' : payment.method === 'card' ? 'Card' : payment.method || '-'}</TableCell>
                    <TableCell><StatusBadge status={payment.status} />{payment.failure_message && <span className="section-note"> {payment.failure_message}</span>}</TableCell>
                    <TableCell>{formatDateTime(payment.completed_at)}</TableCell>
                    <TableCell className="numeric-cell">{formatMoney(payment.amount, payment.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
      {!accessToken && <InvoiceEmailPanel invoiceId={invoice.id} initialSends={emailSendsResult.data || []} historyError={emailSendsResult.error} />}
      {paymentOptions?.enabled && paymentStatus !== 'processing' && (
        <InvoicePayment
          invoiceId={invoice.id}
          accessToken={accessToken}
          methods={paymentOptions.methods}
          amount={Number(invoice.cost ?? invoice.total ?? 0)}
          currency={paymentOptions.currency}
        />
      )}
      {accessToken && !isPaid && (
        <p className="section-note payment-alternatives">Prefer to pay another way? See <Link className="inline-link" href="/payments">all payment options</Link>.</p>
      )}
      <section className="detail-section">
        {lineResult.error ? <Notice>{lineResult.error}</Notice> : (
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
