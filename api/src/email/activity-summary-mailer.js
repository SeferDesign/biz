import nodemailer from 'nodemailer';
import { companyEmailFrom } from '@seferbiz/company';

const defaultRecipient = 'rob@seferdesign.com';
let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    throw new Error('Activity summary email delivery is not configured (SMTP_HOST is required)');
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

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
}

function amountTotal(records) {
  return records.reduce((total, record) => total + Number(record.cost ?? record.total ?? 0), 0);
}

function pluralize(count, singular) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export function activitySummaryRange(period, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let start;
  let end;
  let title;

  if (period === 'weekly') {
    end = today;
    start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 6);
    title = 'Weekly Activity Summary';
  } else if (period === 'monthly') {
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    title = 'Monthly Activity Summary';
  } else {
    throw new Error('Activity summary period must be weekly or monthly');
  }

  return { start: dateOnly(start), end: dateOnly(end), title };
}

export function buildActivitySummary({ period, invoices = [], expenses = [], now = new Date() }) {
  const range = activitySummaryRange(period, now);
  const inRange = (date) => typeof date === 'string' && date.slice(0, 10) >= range.start && date.slice(0, 10) <= range.end;
  const invoicesSent = invoices.filter((invoice) => inRange(invoice.date));
  const invoicesPaid = invoices.filter((invoice) =>
    (invoice.paid === true || invoice.paid === 1 || invoice.status === 'paid') && inRange(invoice.paiddate));
  const periodExpenses = expenses.filter((expense) => inRange(expense.date));
  const startDate = new Date(`${range.start}T00:00:00Z`);
  const endDate = new Date(`${range.end}T00:00:00Z`);
  const subject = `${range.title} - ${formatDate(startDate, { month: 'short', day: 'numeric' })} through ${formatDate(endDate, { month: 'short', day: 'numeric' })}`;
  const text = [
    range.title,
    `${formatDate(startDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} through ${formatDate(endDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
    '',
    `Invoices Paid - ${pluralize(invoicesPaid.length, 'invoice')} totalling $${amountTotal(invoicesPaid).toFixed(2)}`,
    '',
    `Invoices Sent - ${pluralize(invoicesSent.length, 'invoice')} totalling $${amountTotal(invoicesSent).toFixed(2)}`,
    '',
    ...(periodExpenses.length
      ? [`Expenses - ${pluralize(periodExpenses.length, 'expense')}`, `totalling $${amountTotal(periodExpenses).toFixed(2)}`]
      : ['No expenses incurred in this period.'])
  ].join('\n');

  return { ...range, subject, text };
}

export async function sendActivitySummaryEmail({ period, snapshot, now = new Date(), recipient = process.env.ACTIVITY_SUMMARY_EMAIL || defaultRecipient }, transport) {
  const summary = buildActivitySummary({ period, invoices: snapshot.invoices, expenses: snapshot.expenses, now });
  await (transport || getTransporter()).sendMail({
    from: process.env.SMTP_FROM || companyEmailFrom,
    to: recipient,
    subject: `${process.env.NODE_ENV === 'development' ? 'DEV - ' : ''}${summary.subject}`,
    text: summary.text
  });
  return { recipient, ...summary };
}
