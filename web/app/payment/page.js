const banks = [
  'Bank of America', 'Capital One', 'Chase', 'Citi',
  'PNC', 'TD Bank', 'U.S. Bank', 'Wells Fargo'
];

const company = {
  name: 'Sefer Design Company LLC',
  email: 'info@seferdesign.com',
  address: ['205 S Hawthorne Ave.', 'Elmhurst, IL 60126']
};

export const metadata = { title: 'Payment Options | Sefer Design Company' };

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
            <p>Send your payment to <a className="inline-link" href={`mailto:${company.email}`}>{company.email}</a>.</p>
            <p>Supported banks include {banks.join(', ')}.</p>
            <a className="inline-link" href="https://www.zellepay.com/get-started" target="_blank" rel="noreferrer">See participating banks</a>
          </div>
        </section>

        <section className="payment-method">
          <h2>ACH transfer</h2>
          <p>Please <a className="inline-link" href={`mailto:${company.email}`}>contact us</a> for bank account information.</p>
        </section>

        <section className="payment-method">
          <h2>Paper check</h2>
          <div>
            <p>Make the check payable to <strong>{company.name}</strong> and mail it to:</p>
            <address>{company.name}<br />{company.address[0]}<br />{company.address[1]}</address>
          </div>
        </section>
      </div>
    </>
  );
}
