import nodemailer from 'nodemailer';
import { createInvoicePdf } from '../pdf/invoice-pdf.js';

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    throw new Error('Invoice email delivery is not configured (SMTP_HOST is required)');
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

export async function sendInvoiceEmail({ invoice, client, lines }, transport) {
  const recipient = client.email || client.email_accounting;
  if (!recipient) throw new Error('The client does not have a billing email address');

  const currency = invoice.currency || 'USD';
  const total = Number(invoice.cost ?? invoice.total ?? 0).toFixed(2);
  const lineDetails = lines.map((line) => {
    const amount = Number(line.total ?? line.amount ?? 0).toFixed(2);
    const quantity = line.hours ? ` (${line.hours} hours${line.rate ? ` at ${currency} ${line.rate}/hour` : ''})` : '';
    return `- ${line.description || 'Invoice item'}${quantity}: ${currency} ${amount}`;
  });
  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, '');
  const invoiceUrl = appUrl ? `${appUrl}/invoices/${invoice.id}` : null;
  const text = [
    `Invoice #${String(invoice.id).padStart(4, '0')}`,
    `Client: ${client.name || 'Client'}`,
    `Issue date: ${invoice.date || 'Not specified'}`,
    '',
    'Line items:',
    ...(lineDetails.length ? lineDetails : ['- No line items']),
    '',
    `Total: ${currency} ${total}`,
    ...(invoiceUrl ? ['', `View invoice: ${invoiceUrl}`] : [])
  ].join('\n');
  const pdf = await createInvoicePdf({ invoice, client, lines });

  await (transport || getTransporter()).sendMail({
    from: process.env.SMTP_FROM || 'Sefer Design Co. <info@seferdesign.com>',
    to: recipient,
    cc: [client.email_accounting_2, client.email_accounting_3].filter(Boolean),
    subject: `${process.env.NODE_ENV === 'development' ? 'DEV - ' : ''}Invoice from Sefer Design Company`,
    text,
    attachments: [{
      filename: `Invoice-${String(invoice.id).padStart(4, '0')}.pdf`,
      content: pdf,
      contentType: 'application/pdf'
    }]
  });
  return { recipient };
}
