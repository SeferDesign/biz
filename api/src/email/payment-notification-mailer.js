import nodemailer from 'nodemailer';
import { companyEmailFrom, companyInfo } from '@seferbiz/company';

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    throw new Error('Payment notification delivery is not configured (SMTP_HOST is required)');
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      ...(process.env.SMTP_USER ? {
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
      } : {})
    });
  }
  return transporter;
}

const methodLabels = { us_bank_account: 'ACH', card: 'Card' };
const statusHeadlines = {
  processing: 'payment submitted',
  succeeded: 'payment received',
  failed: 'payment failed'
};

export async function sendPaymentNotification({ payment, invoice, client, livemode }, transport) {
  const recipient = process.env.PAYMENT_NOTIFICATION_EMAIL || companyInfo.emailContact;
  const method = methodLabels[payment.method] || 'Online';
  const invoiceNumber = `#${String(invoice.id).padStart(4, '0')}`;
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: payment.currency || 'USD' })
    .format(Number(payment.amount ?? invoice.cost ?? 0));
  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, '');
  const dashboardUrl = payment.stripe_payment_intent_id
    ? `https://dashboard.stripe.com/${livemode ? '' : 'test/'}payments/${payment.stripe_payment_intent_id}`
    : null;

  await (transport || getTransporter()).sendMail({
    from: process.env.SMTP_FROM || companyEmailFrom,
    to: recipient,
    subject: `${process.env.NODE_ENV === 'development' ? 'DEV - ' : ''}${method} ${statusHeadlines[payment.status]}: Invoice ${invoiceNumber} (${client?.name || 'Client'}, ${amount})`,
    text: [
      `${method} ${statusHeadlines[payment.status]} for invoice ${invoiceNumber}.`,
      '',
      `Client: ${client?.name || '-'}`,
      `Amount: ${amount}`,
      `Status: ${payment.status}`,
      ...(payment.status === 'processing' ? ['ACH payments usually clear within 4 business days. You will get another email when it clears or fails.'] : []),
      ...(payment.failure_message ? [`Reason: ${payment.failure_message}`] : []),
      '',
      ...(appUrl ? [`Invoice: ${appUrl}/invoices/${invoice.id}`] : []),
      ...(dashboardUrl ? [`Stripe: ${dashboardUrl}`] : [])
    ].join('\n')
  });
  return { recipient };
}
