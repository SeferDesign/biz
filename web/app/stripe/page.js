import Link from 'next/link';
import { formatDate, formatMoney } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export const metadata = { title: 'Stripe | Sefer Design Company' };

const methodLabels = { card: 'Card', us_bank_account: 'ACH' };

export default async function StripePage() {
  const result = await getApiData('/stripe/payouts');
  const heading = (
    <div className="page-heading">
      <div>
        <p className="eyebrow">BUSINESS OFFICE / PAYMENTS</p>
        <h1>Stripe</h1>
        <p className="page-description">Recent payouts and invoice payments collected through Stripe.</p>
      </div>
    </div>
  );
  if (result.error) {
    return <>{heading}<div className="notice" role="alert"><strong>Stripe data unavailable</strong><span>{result.error}</span></div></>;
  }

  const { payouts = [], payments = [], has_more: hasMore } = result.data || {};
  return (
    <>
      {heading}
      <section className="detail-section">
        <div className="section-heading"><h2>Payouts</h2><span className="section-note">{payouts.length} most recent</span></div>
        {payouts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Arrival date</th><th>Status</th><th className="numeric-cell">Amount</th></tr></thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="primary-cell">{formatDate(payout.arrival_date)}</td>
                    <td>{payout.status}</td>
                    <td className="numeric-cell">{formatMoney(payout.amount, payout.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="section-note">No payouts yet.</p>}
      </section>
      <section className="detail-section">
        <div className="section-heading"><h2>Invoice payments</h2><span className="section-note">{payments.length} most recent</span></div>
        {payments.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Invoice</th><th>Method</th><th>Status</th><th className="numeric-cell">Amount</th><th className="numeric-cell">Fee</th><th className="numeric-cell">Net</th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="primary-cell">{formatDate(payment.created)}</td>
                    <td>{payment.invoice_id ? <Link className="table-link" href={`/invoices/${payment.invoice_id}`}>{String(payment.invoice_id).padStart(4, '0')}</Link> : '-'}</td>
                    <td>{methodLabels[payment.payment_method] || payment.payment_method || '-'}</td>
                    <td>{payment.status}</td>
                    <td className="numeric-cell">{formatMoney(payment.amount, payment.currency)}</td>
                    <td className="numeric-cell">{payment.fee === null ? '-' : formatMoney(-payment.fee, payment.currency)}</td>
                    <td className="numeric-cell">{payment.net === null ? '-' : formatMoney(payment.net, payment.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="section-note">No Stripe payments yet.</p>}
      </section>
      {hasMore && <p className="section-note">Showing the 100 most recent records. See the Stripe Dashboard for full history.</p>}
    </>
  );
}
