import AppShell from '../components/AppShell.js';
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
  description: ''
};

export default async function RootLayout({ children }) {
  const session = await getApiData('/auth/session');
  return (
    <html className={instrumentSans.variable} lang="en">
      <body><AppShell user={session.data?.user}>{children}</AppShell></body>
    </html>
  );
}
