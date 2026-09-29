export const metadata = {
  title: 'Sefer Design Biz',
  description: 'Invoicing and expense tracking'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
