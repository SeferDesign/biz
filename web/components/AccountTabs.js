'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.js';

const tabs = [
  { href: '/settings/account/profile', label: 'Profile' },
  { href: '/settings/account/security', label: 'Security' },
  { href: '/settings/account/password', label: 'Password' },
  { href: '/settings/account/api-keys', label: 'API Keys' }
];

export default function AccountTabs({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = tabs.find((tab) => pathname === tab.href)?.href || tabs[0].href;

  return (
    <Tabs value={activeTab} onValueChange={(href) => router.push(href)} className="min-w-0 gap-4">
      <TabsList aria-label="Account settings" className="grid h-auto w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
        {tabs.map((tab) => <TabsTrigger className="w-full" key={tab.href} value={tab.href}>{tab.label}</TabsTrigger>)}
      </TabsList>
      <TabsContent value={activeTab} className="mt-0 min-w-0 focus-visible:outline-none">{children}</TabsContent>
    </Tabs>
  );
}
