import AppShell from '../components/AppShell.js';
import './globals.css';

export const metadata = {
  title: 'Sefer Design | Business Office',
  description: 'Business operations ledger for Sefer Design Company.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
