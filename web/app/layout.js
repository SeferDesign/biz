import AppShell from '../components/AppShell.js';
import { Toaster } from '../components/ui/sonner.js';
import { createHash } from 'node:crypto';
import { getApiData } from '../lib/api-server.js';
import './globals.css';
import { companyInfo } from '@seferbiz/company';

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
    <html lang="en">
      <body>
        <AppShell user={session.data?.user} avatarUrl={avatarUrl}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
