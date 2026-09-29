'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { href: '/', label: 'Overview', index: '00' },
  { href: '/invoices', label: 'Invoices', index: '01' },
  { href: '/clients', label: 'Clients', index: '02' },
  { href: '/expenses', label: 'Expenses', index: '03' },
  { href: '/vendors', label: 'Vendors', index: '04' },
  { href: '/years', label: 'Years', index: '05' }
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Sefer Design Company overview">
          <span className="brand-mark">SD</span>
          <span className="brand-name">Sefer Design<span>Business office</span></span>
        </Link>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const active = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={`nav-link${active ? ' is-active' : ''}`}
                href={item.href}
                key={item.href}
                aria-current={active ? 'page' : undefined}
              >
                <span className="nav-index">{item.index}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-rule" />
          <span>Sefer Design Company LLC</span>
          <span className="sidebar-foot-note">BUSINESS LEDGER</span>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <span className="topbar-section">OPERATIONS</span>
          <span className="topbar-date">SEFER DESIGN COMPANY</span>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
