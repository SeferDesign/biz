import { companyInfo } from '@seferbiz/company';

const banks = [
  'Bank of America', 'Capital One', 'Chase', 'Citi',
  'PNC', 'TD Bank', 'U.S. Bank', 'Wells Fargo'
];

const companyAddressLine2 = `${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipcode}`;

export const metadata = { title: 'Payment Options' };

export default function PaymentPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Payment Options</h1>
          <p className="page-description">Choose the payment method that works best for you.</p>
        </div>
      </div>

      <p className="payment-intro">For electronic or credit card payments, please see your individual invoice email. All payment options are summarized below.</p>

      <div className="payment-options">
        <section className="payment-method">
          <h2>Credit card, debit card, or bank account</h2>
          <div>
            <p>Pay securely online through Stripe using the link in your invoice email. Your invoice shows any applicable processing fee and the full total before you confirm payment.</p>
          </div>
        </section>

        <section className="payment-method">
          <h2>Zelle</h2>
          <div>
            <p>Send your payment to <a className="inline-link" href={`mailto:${companyInfo.emailFrom}`}>{companyInfo.emailFrom}</a>.</p>
            <p>Supported banks include {banks.join(', ')}.</p>
            <a className="inline-link" href="https://www.zellepay.com/get-started" target="_blank" rel="noreferrer">See participating banks</a>
          </div>
        </section>

        <section className="payment-method">
          <h2>ACH transfer</h2>
          <p>Please <a className="inline-link" href={`mailto:${companyInfo.emailContact}`}>contact us</a> for bank account information.</p>
        </section>

        <section className="payment-method">
          <h2>Paper check</h2>
          <div>
            <p>Make the check payable to <strong>{companyInfo.legalEntity}</strong> and mail it to:</p>
            <address>{companyInfo.legalEntity}<br />{companyInfo.address.address1}<br />{companyAddressLine2}</address>
          </div>
        </section>
      </div>
    </>
  );
}
