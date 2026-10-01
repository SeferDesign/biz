'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  House,
  Receipt,
  Award,
  Users
} from 'lucide-react';
import OmniSearch from './OmniSearch.js';

const primaryNavigation = [
  { href: '/', label: 'Overview', icon: House },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendors', label: 'Vendors', icon: Building2 },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/years', label: 'Years', icon: CalendarDays }
];

const secondaryNavigation = [
  { href: '/best', label: 'Best Performances', icon: Award },
  { href: '/payments', label: 'Payment Options', icon: CreditCard }
];

function NavIcon({ icon: Icon }) {
  return (
    <span className="nav-icon" aria-hidden="true">
      <Icon size={18} strokeWidth={1.75} />
    </span>
  );
}

function navItem(pathname, item, secondary = false) {
  const active = item.href === '/'
    ? pathname === '/'
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      className={`nav-link${secondary ? ' nav-link-secondary' : ''}${active ? ' is-active' : ''}`}
      href={item.href}
      key={item.href}
      aria-current={active ? 'page' : undefined}
    >
      <NavIcon icon={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AppShell({ children, user }) {
  const pathname = usePathname();
  if (['/login', '/forgot-password', '/reset-password'].includes(pathname)) return children;
  // Visitors without a session only reach public pages and access-token record links.
  if (!user?.email) {
    return (
      <div className="public-shell">
        <header className="public-header">
          <a className="brand" href="https://seferdesign.com">
            <img className="brand-logo" src="/images/sdc_white.svg" alt="Sefer Design Co." />
          </a>
        </header>
        <main className="main-content">{children}</main>
      </div>
    );
  }
  const accountHref = '/settings/account/profile';
  const accountActive = pathname.startsWith('/settings/account');
  const fullName = [user?.first_name, user?.last_name]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ');
  const avatarInitial = fullName.charAt(0).toUpperCase() || user?.email?.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Sefer Design Company overview">
          <img className="brand-logo" src="/images/sdc_white.svg" alt="" />
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          {primaryNavigation.map((item) => navItem(pathname, item))}
        </nav>
        <nav className="secondary-nav" aria-label="Secondary navigation">
          {secondaryNavigation.map((item) => navItem(pathname, item, true))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-account">
            <Link className={`account-link${accountActive ? ' is-active' : ''}`} href={accountHref} aria-current={accountActive ? 'page' : undefined}>
              <span className="account-avatar" aria-hidden="true">{avatarInitial}</span>
              <span className="account-copy">
                <strong>{fullName || 'Account'}</strong>
                <span>{user?.email || 'Sign in to your account'}</span>
              </span>
            </Link>
            {user.email
              ? <form action="/api/auth/logout" method="post"><button className="sidebar-sign-out" type="submit">Sign out</button></form>
              : <Link className="sidebar-sign-out" href="/login">Sign in</Link>}
          </div>
        </div>
      </aside>
      <div className="main-frame">
			{['/payment', '/payments'].includes(pathname) ? '' :
        <header className="topbar">
					<OmniSearch />
        </header>
				}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
