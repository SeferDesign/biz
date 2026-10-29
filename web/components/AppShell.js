'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
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
import Brand from './Brand.js';
import { Button } from './ui/button.js';

const overviewNavigation = [
  { href: '/', label: 'Overview', icon: House },
];

const recordsNavigation = [
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/vendors', label: 'Vendors', icon: Building2 },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/years', label: 'Years', icon: CalendarDays }
];

const insightsNavigation = [
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

function navItem(pathname, item) {
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
      <NavIcon icon={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}

function navGroup(pathname, label, items) {
  return (
    <section className="sidebar-nav-group" key={label}>
      <h2 className="sidebar-group-label">{label}</h2>
      <div className="primary-nav">{items.map((item) => navItem(pathname, item))}</div>
    </section>
  );
}

export default function AppShell({ children, user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  if (['/login', '/forgot-password', '/reset-password'].includes(pathname)) return children;
  // Visitors without a session only reach public pages and access-token record links.
  if (!user?.email) {
    return (
      <div className="public-shell">
        <header className="public-header">
          <Brand/>
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

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch(`${browserApiBaseUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Session cleanup is handled by the API; continue to login screen either way.
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Brand />
        </div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          {navGroup(pathname, 'Workspace', overviewNavigation)}
          {navGroup(pathname, 'Records', recordsNavigation)}
          {navGroup(pathname, 'Insights', insightsNavigation)}
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
            <Button className="sidebar-sign-out" variant="ghost" type="button" disabled={signingOut} onClick={signOut}>{signingOut ? 'Signing out...' : 'Sign out'}</Button>
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
