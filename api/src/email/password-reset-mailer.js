import nodemailer from 'nodemailer';
import { companyEmailFrom, companyInfo } from '@seferbiz/company';

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    throw new Error('Password reset email delivery is not configured (SMTP_HOST is required)');
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

export async function sendPasswordResetEmail({ email, token, expiresInHours }, transport) {
  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!appUrl) throw new Error('PUBLIC_APP_URL is required to create a password reset link');
  const resetUrl = new URL('/reset-password', appUrl);
  resetUrl.searchParams.set('token', token);

  await (transport || getTransporter()).sendMail({
    from: process.env.SMTP_FROM || companyEmailFrom,
    to: email,
    subject: `${process.env.NODE_ENV === 'development' ? 'DEV - ' : ''}Reset your ${companyInfo.name} password`,
    text: [
      `A password reset was requested for your ${companyInfo.legalEntity} account.`,
      '',
      `Reset your password: ${resetUrl}`,
      '',
      `This link expires in ${expiresInHours} hours and can only be used once.`,
      'If you did not request this change, you can ignore this email.'
    ].join('\n')
  });
}
