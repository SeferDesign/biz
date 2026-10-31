'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
import {
  Building2,
  CalendarDays,
  CreditCard,
  HardDrive,
  FileText,
  House,
  Receipt,
  Award,
  Users,
  ChevronDown,
  LogOut,
  GalleryVerticalEnd,
  Search
} from 'lucide-react';
import OmniSearch from './OmniSearch.js';
import Brand from './Brand.js';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.js';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from './ui/sidebar.js';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { companyInfo } from '@seferbiz/company';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from './ui/breadcrumb.js';

const overviewNavigation = [
	{ href: '/', label: 'Overview', icon: House },
  { href: '/clients', label: 'Clients', icon: Users },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: FileText,
    children: [{ href: '/settings/templates', label: 'Templates' }]
  },
  { href: '/vendors', label: 'Vendors', icon: Building2 },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/years', label: 'Years', icon: CalendarDays }
];

const insightsNavigation = [
  { href: '/best', label: 'Best Performances', icon: Award },
  { href: '/payments', label: 'Payment Options', icon: CreditCard },
  { href: '/settings/backups', label: 'Backup Status', icon: HardDrive }
];

const staticBreadcrumbs = {
  '/': [{ label: 'Overview' }],
  '/clients': [{ label: 'Workspace', href: '/' }, { label: 'Clients' }],
  '/invoices': [{ label: 'Workspace', href: '/' }, { label: 'Invoices' }],
  '/vendors': [{ label: 'Workspace', href: '/' }, { label: 'Vendors' }],
  '/expenses': [{ label: 'Workspace', href: '/' }, { label: 'Expenses' }],
  '/years': [{ label: 'Workspace', href: '/' }, { label: 'Years' }],
  '/best': [{ label: 'Insights' }, { label: 'Best Performances' }],
  '/payments': [{ label: 'Insights' }, { label: 'Payment Options' }],
  '/payment': [{ label: 'Payment' }],
  '/settings/templates': [{ label: 'Invoices', href: '/invoices' }, { label: 'Templates' }],
  '/settings/backups': [{ label: 'Insights' }, { label: 'Backup Status' }],
  '/settings/account': [{ label: 'Account' }],
  '/settings/account/profile': [{ label: 'Account', href: '/settings/account' }, { label: 'Profile' }],
  '/settings/account/api-keys': [{ label: 'Account', href: '/settings/account' }, { label: 'API Keys' }],
  '/settings/account/password': [{ label: 'Account', href: '/settings/account' }, { label: 'Password' }],
  '/settings/account/security': [{ label: 'Account', href: '/settings/account' }, { label: 'Security' }],
  '/settings/password': [{ label: 'Settings' }, { label: 'Password' }],
  '/settings/security': [{ label: 'Settings' }, { label: 'Security' }]
};

const resourceBreadcrumbs = {
  clients: { plural: 'Clients', singular: 'Client' },
  invoices: { plural: 'Invoices', singular: 'Invoice' },
  vendors: { plural: 'Vendors', singular: 'Vendor' },
  expenses: { plural: 'Expenses', singular: 'Expense' },
  years: { plural: 'Years', singular: 'Year' }
};

function getBreadcrumbItems(pathname) {
  if (staticBreadcrumbs[pathname]) return staticBreadcrumbs[pathname];

  const segments = pathname.split('/').filter(Boolean);
  const resource = resourceBreadcrumbs[segments[0]];
  if (!resource) return [{ label: segments.at(-1)?.replaceAll('-', ' ') || 'Page' }];

  const basePath = `/${segments[0]}`;
  const items = [{ label: 'Workspace', href: '/' }, { label: resource.plural, href: basePath }];
  if (segments[1] === 'new') return [...items, { label: `New ${resource.singular}` }];
  if (segments.length < 2) return items;

  const detailPath = `${basePath}/${segments[1]}`;
  const detailLabel = segments[0] === 'years' ? segments[1] : `${resource.singular} #${segments[1]}`;
  items.push({ label: detailLabel, href: detailPath });
  if (segments[2] === 'edit') items.push({ label: 'Edit' });
  return items;
}

function NavItem({ pathname, item }) {
  const { setOpenMobile } = useSidebar();
  const isRouteActive = (href) => href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
  const active = isRouteActive(item.href) || item.children?.some((child) => isRouteActive(child.href));
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href} aria-current={isRouteActive(item.href) ? 'page' : undefined} onClick={() => setOpenMobile(false)}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {item.children?.length > 0 && (
        <SidebarMenuSub>
          {item.children.map((child) => {
            const childActive = isRouteActive(child.href);
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton asChild isActive={childActive}>
                  <Link href={child.href} aria-current={childActive ? 'page' : undefined} onClick={() => setOpenMobile(false)}>
                    <span>{child.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

function NavGroup({ pathname, label, items }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => <NavItem key={item.href} pathname={pathname} item={item} />)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function TeamSwitcher() {
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          aria-label={companyInfo.name}
          className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
        >
          <Link href={companyInfo.website} className="flex h-full w-full items-center overflow-hidden rounded-md px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            {state === 'collapsed' ? (
              <GalleryVerticalEnd aria-hidden="true" />
            ) : (
              <img src={companyInfo.logo.pathPublic} alt={companyInfo.name} className="h-auto w-[190px] max-w-none shrink-0 brightness-0" />
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SidebarSearch() {
  const { isMobile, state, toggleSidebar } = useSidebar();

  if (state === 'collapsed' && !isMobile) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Search records" onClick={toggleSidebar}>
            <Search />
            <span>Search records</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return <OmniSearch />;
}

function Breadcrumbs({ pathname }) {
  const items = getBreadcrumbItems(pathname);
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className={index < items.length - 1 ? 'hidden md:inline-flex' : 'min-w-0'}>
              {index === items.length - 1 ? (
                <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
              ) : item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="truncate">{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function AppShell({ children, user, avatarUrl }) {
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
        <div className="main-content">{children}</div>
      </div>
    );
  }
  const accountHref = '/settings/account/profile';
  const accountActive = pathname.startsWith('/settings/account');
  const fullName = [user?.first_name, user?.last_name]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ');
  const avatarInitials = [user.first_name, user.last_name]
    .map((value) => (typeof value === 'string' ? value.trim().charAt(0) : ''))
    .join('')
    .toUpperCase() || user.email.trim().charAt(0).toUpperCase() || '?';

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
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <TeamSwitcher />
          {!['/payment', '/payments'].includes(pathname) && <SidebarSearch />}
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Main navigation">
            <NavGroup pathname={pathname} label="Workspace" items={overviewNavigation} />
            <NavGroup pathname={pathname} label="Insights" items={insightsNavigation} />
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    isActive={accountActive}
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-md">
                      <AvatarImage src={avatarUrl} alt={fullName || user.email} />
                      <AvatarFallback className="rounded-md">{avatarInitials}</AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{fullName || 'Account'}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </span>
                    <ChevronDown className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="right"
                    align="end"
                    sideOffset={4}
                    className="z-50 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href={accountHref}
                        aria-current={accountActive ? 'page' : undefined}
                        className="flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                      >
                        Account settings
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
                    <DropdownMenu.Item
                      disabled={signingOut}
                      onSelect={(event) => {
                        event.preventDefault();
                        signOut();
                      }}
                      className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[disabled]:opacity-50"
                    >
                      <LogOut className="size-4" />
                      {signingOut ? 'Signing out...' : 'Sign out'}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger />
          <div aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <Breadcrumbs pathname={pathname} />
        </header>
        <main className="main-content">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
