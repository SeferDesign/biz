import { companyInfo, formatMailingAddress } from '@seferbiz/company';
import { CreditCard, HandCoins, Landmark, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Separator } from '../../components/ui/separator.js';

const banks = [
  'Bank of America', 'Capital One', 'Chase', 'Citi',
  'PNC', 'TD Bank', 'U.S. Bank', 'Wells Fargo'
];

export const metadata = { title: 'Payment Options' };

function PaymentMethodRow({ icon: Icon, title, children }) {
  return (
    <div className="flex gap-4 py-5">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 space-y-1">
        <h3 className="font-medium">{title}</h3>
        <div className="space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Payment options</h1>
        <p className="text-muted-foreground">Choose the method that works best for you. Online payment fees and totals are shown before you confirm.</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <CreditCard className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <CardTitle>Pay online through your invoice</CardTitle>
            <CardDescription>Credit card, debit card, or bank account</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Use the secure payment link in your invoice email. Your invoice displays any applicable processing fee and the full total before payment is submitted.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other ways to pay</CardTitle>
          <CardDescription>For a method not listed on your invoice, contact us for help.</CardDescription>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          <Separator />
          <PaymentMethodRow icon={HandCoins} title="Zelle">
            <p>Send your payment to <a className="text-foreground underline underline-offset-4" href={`mailto:${companyInfo.emailContact}`}>{companyInfo.emailContact}</a>.</p>
            <p>Supported banks include: {banks.join(', ')}. <a className="text-foreground underline underline-offset-4" href="https://www.zellepay.com/get-started" target="_blank" rel="noreferrer">See all participating banks</a>.</p>
          </PaymentMethodRow>
          <Separator />
          <PaymentMethodRow icon={Landmark} title="ACH transfer">
            <p>Please <a className="text-foreground underline underline-offset-4" href={`mailto:${companyInfo.emailContact}`}>contact us</a> for bank account information.</p>
          </PaymentMethodRow>
          <Separator />
          <PaymentMethodRow icon={Mail} title="Paper check">
            <p>Make the check payable to <span className="font-medium text-foreground">{companyInfo.legalEntity}</span> and mail it to:</p>
            <address className="whitespace-pre-line not-italic">{companyInfo.legalEntity}{'\n'}{formatMailingAddress(companyInfo.address)}</address>
          </PaymentMethodRow>
        </CardContent>
      </Card>
    </div>
  );
}
