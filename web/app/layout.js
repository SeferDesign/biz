import AppShell from '../components/AppShell.js';
import { getApiData } from '../lib/api-server.js';
import './globals.css';

export const metadata = {
  title: 'Sefer Design Co. Biz Admin',
  description: ''
};

export default async function RootLayout({ children }) {
  const session = await getApiData('/auth/session');
  return (
    <html lang="en">
      <body><AppShell accountEmail={session.data?.user?.email}>{children}</AppShell></body>
    </html>
  );
}
