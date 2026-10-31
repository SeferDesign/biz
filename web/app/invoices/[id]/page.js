import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileDown } from 'lucide-react';
import { formatMailingAddress } from '@seferbiz/company';
import { DetailGrid, ResourcePage, StatusBadge } from '../../../components/ResourcePage.js';
import ResourceActions from '../../../components/ResourceActions.js';
import InvoiceActions from '../../../components/InvoiceActions.js';
import InvoiceEmailPanel from '../../../components/InvoiceEmailPanel.js';
import InvoicePayment from '../../../components/InvoicePayment.js';
import ClientLinkPanel from '../../../components/ClientLinkPanel.js';
import Notice from '../../../components/Notice.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card.js';
import { Button } from '../../../components/ui/button.js';
import { Separator } from '../../../components/ui/separator.js';
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
  const billedToAddress = billedTo && formatMailingAddress(billedTo);
  const detailItems = accessToken
    ? [
      [isPaid ? 'Amount' : 'Amount due', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
      ['Billed to', billedTo?.name],
      ['Issue date', formatDate(invoice.date)],
      ['Payment terms', billedTo?.payment_terms || 'Net 15'],
      ...(billedToAddress ? [['Address', <address className="not-italic whitespace-pre-line">{billedToAddress}</address>]] : []),
      ...(isPaid ? [['Paid date', formatDate(invoice.paiddate)], ['Payment method', invoice.paymenttype]] : [])
    ]
    : [
      ['Amount', formatMoney(invoice.cost ?? invoice.total, invoice.currency)],
      ['Client', <Link href={`/clients/${invoice.client_id}`} key="client">{clientName}</Link>],
      ['Payment type', invoice.paymenttype],
      ['Issue date', formatDate(invoice.date)],
      ['Paid date', formatDate(invoice.paiddate)]
    ];
  const publicDetailItems = detailItems.filter(([label, value]) => (
    label !== 'Amount' && label !== 'Amount due' && value != null && value !== '' && value !== '-'
  ));
  const lineItemsContent = lineResult.error ? (
    <Notice>{lineResult.error}</Notice>
  ) : (
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
  );
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
      {accessToken ? (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Invoice</p>
            <h1 className="text-3xl font-semibold">Invoice #{invoice.id}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={invoiceStatus(invoice)} />
            <Button asChild variant="outline"><a href={`${browserApiBaseUrl}/invoices/${invoice.id}/pdf${accessTokenQuery}`}><FileDown className="size-4" aria-hidden="true" />Download PDF</a></Button>
          </div>
        </header>
      ) : (
        <div className="page-heading">
          <div><h1>Invoice #{invoice.id}</h1></div>
          <div className="detail-actions flex flex-wrap items-center gap-2">
            <InvoiceActions key={`${invoice.id}-${invoiceStatus(invoice)}`} invoice={invoice} lines={lines} linesAvailable={!lineResult.error} />
            <Button asChild variant="outline"><a href={`${browserApiBaseUrl}/invoices/${invoice.id}/pdf${accessTokenQuery}`}><FileDown className="size-4" aria-hidden="true" />Download PDF</a></Button>
            <ResourceActions editHref={`/invoices/${invoice.id}/edit`} deleteEndpoint={`${browserApiBaseUrl}/invoices/${invoice.id}`} returnTo="/invoices" label="invoice" />
          </div>
        </div>
      )}
      {accessToken ? (
        <Card>
          <CardHeader>
            <CardDescription>{isPaid ? 'Amount paid' : 'Amount due'}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{formatMoney(invoice.cost ?? invoice.total, invoice.currency)}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-6">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
              {publicDetailItems.map(([label, value]) => (
                <div className="min-w-0 space-y-1" key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="break-words text-sm font-medium">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            {invoice.description && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">Description</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{invoice.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <DetailGrid items={detailItems} />
          <p className="invoice-description">{invoice.description}</p>
        </>
      )}
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
        <div className="flex flex-col gap-2 rounded-md bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Prefer a different payment method?</p>
          <Button asChild variant="link" size="sm"><Link href="/payments">View all payment options</Link></Button>
        </div>
      )}
      {accessToken ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Itemized services</CardTitle>
            <CardDescription>Details for this invoice.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="overflow-x-auto p-0">{lineItemsContent}</CardContent>
        </Card>
      ) : (
        <section className="mt-8">{lineItemsContent}</section>
      )}
    </>
  );
}
