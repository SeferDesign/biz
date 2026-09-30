'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OmniSearch from './OmniSearch.js';

const navigation = [
  { href: '/', label: 'Overview', index: '00' },
  { href: '/invoices', label: 'Invoices', index: '01' },
  { href: '/clients', label: 'Clients', index: '02' },
  { href: '/expenses', label: 'Expenses', index: '03' },
  { href: '/vendors', label: 'Vendors', index: '04' },
  { href: '/years', label: 'Years', index: '05' },
  { href: '/best', label: 'Best', index: '06' },
  { href: '/payment', label: 'Payment', index: '07' }
];

export default function AppShell({ children, accountEmail }) {
  const pathname = usePathname();
  if (['/login', '/forgot-password', '/reset-password'].includes(pathname)) return children;
  const accountHref = '/settings/account/security';
  const accountActive = pathname.startsWith('/settings/account');
  const avatarInitial = accountEmail?.trim().charAt(0).toUpperCase() || '?';

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
          <div className="sidebar-company">
            <span className="sidebar-rule" />
            <span>Sefer Design Company LLC</span>
            <span className="sidebar-foot-note">BUSINESS LEDGER</span>
          </div>
          <div className="sidebar-account">
            <Link className={`account-link${accountActive ? ' is-active' : ''}`} href={accountHref} aria-current={accountActive ? 'page' : undefined}>
              <span className="account-avatar" aria-hidden="true">{avatarInitial}</span>
              <span className="account-copy">
                <strong>Account</strong>
                <span>{accountEmail || 'Sign in to your account'}</span>
              </span>
            </Link>
            {accountEmail
              ? <form action="/api/auth/logout" method="post"><button className="sidebar-sign-out" type="submit">Sign out</button></form>
              : <Link className="sidebar-sign-out" href="/login">Sign in</Link>}
          </div>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <span className="topbar-section">OPERATIONS</span>
          {pathname === '/payment' ? <span className="topbar-date">SEFER DESIGN COMPANY</span> : <OmniSearch />}
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
