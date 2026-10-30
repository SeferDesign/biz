import AppShell from '../components/AppShell.js';
import { createHash } from 'node:crypto';
import { getApiData } from '../lib/api-server.js';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';
import { companyInfo } from '@seferbiz/company';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans'
});

export const metadata = {
  title: `${companyInfo.name} ${companyInfo.acronym} Admin`,
  description: '',
  icons: {
    icon: '/images/favicon.png'
  }
};

export default async function RootLayout({ children }) {
  const session = await getApiData('/auth/session');
  const email = session.data?.user?.email?.trim().toLowerCase();
  const avatarUrl = email
    ? `https://www.gravatar.com/avatar/${createHash('sha256').update(email).digest('hex')}?d=404&s=80`
    : undefined;
  return (
    <html className={instrumentSans.variable} lang="en">
      <body><AppShell user={session.data?.user} avatarUrl={avatarUrl}>{children}</AppShell></body>
    </html>
  );
}
