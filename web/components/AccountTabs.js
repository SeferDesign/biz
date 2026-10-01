'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/settings/account/profile', label: 'Profile' },
  { href: '/settings/account/security', label: 'Security' },
  { href: '/settings/account/password', label: 'Password' }
];

export default function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav className="account-tabs" aria-label="Account settings">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return <Link href={tab.href} key={tab.href} aria-current={active ? 'page' : undefined}>{tab.label}</Link>;
      })}
    </nav>
  );
}
