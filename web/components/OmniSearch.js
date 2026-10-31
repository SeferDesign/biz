'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { Building2, CalendarDays, FileText, ListTree, Receipt, Search, Users } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from './ui/command.js';
import { Kbd } from './ui/kbd.js';
import { Skeleton } from './ui/skeleton.js';

const resultGroups = [
  { type: 'Client', label: 'Clients', Icon: Users },
  { type: 'Invoice', label: 'Invoices', Icon: FileText },
  { type: 'Expense', label: 'Expenses', Icon: Receipt },
  { type: 'Vendor', label: 'Vendors', Icon: Building2 },
  { type: 'Line item', label: 'Line items', Icon: ListTree },
  { type: 'Year', label: 'Years', Icon: CalendarDays }
];

const createActions = [
  { label: 'New invoice', detail: 'Create a client invoice', href: '/invoices/new', Icon: FileText },
  { label: 'New expense', detail: 'Record a business expense', href: '/expenses/new', Icon: Receipt },
  { label: 'New client', detail: 'Add a client', href: '/clients/new', Icon: Users },
  { label: 'New vendor', detail: 'Add a vendor', href: '/vendors/new', Icon: Building2 },
  { label: 'New financial year', detail: 'Set goals and tax rate', href: '/years/new', Icon: CalendarDays },
  { label: 'New invoice template', detail: 'Create a reusable invoice description', href: '/settings/templates/new', Icon: FileText }
];

export default function OmniSearch({ compact = false }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const hasQuery = query.trim().length > 0;
  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) {
      setResults([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${browserApiBaseUrl}/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, credentials: 'include' });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || `Search failed (${response.status})`);
        setResults(body.results || []);
      } catch (cause) {
        if (cause.name !== 'AbortError') {
          setResults([]);
          setError('Search is temporarily unavailable.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    function toggleShortcut(event) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setOpen((current) => !current);
    }
    document.addEventListener('keydown', toggleShortcut);
    return () => document.removeEventListener('keydown', toggleShortcut);
  }, []);

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
      setResults([]);
      setError('');
      setLoading(false);
    }
  }

  function navigateTo(href) {
    handleOpenChange(false);
    router.push(href);
  }

  const groupedResults = resultGroups
    .map((group) => ({ ...group, items: results.filter((item) => item.type === group.type) }))
    .filter((group) => group.items.length > 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Search"
          title={compact ? 'Search' : undefined}
          className={compact
            ? 'flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            : 'flex h-10 w-full min-w-0 max-w-lg items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm text-muted-foreground shadow-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          {compact ? <span className="sr-only">Search</span> : <>
            <span className="min-w-0 flex-1 truncate">Search...</span>
            <Kbd aria-hidden="true">⌘K</Kbd>
          </>}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none">
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Search clients, invoices, expenses, vendors, line items, and years.</DialogPrimitive.Description>
          <Command className="rounded-none border-0 p-0 shadow-none" shouldFilter={false} loop>
            <CommandInput
              aria-label="Search"
              aria-keyshortcuts="Meta+K Control+K"
              placeholder="Search clients, invoices, expenses..."
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setResults([]);
                setLoading(value.trim().length >= 2);
                setError('');
              }}
            />
            <CommandList aria-label="Search results" className="max-h-[min(60vh,26rem)] p-1">
              {!hasQuery && (
                <CommandGroup heading="Create">
                  {createActions.map(({ label, detail, href, Icon }) => (
                    <CommandItem key={href} value={`${label} ${detail}`} onSelect={() => navigateTo(href)}>
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span className="truncate text-xs text-muted-foreground">{detail}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {hasQuery && canSearch && <CommandSeparator />}
              {loading || error ? (
                loading ? (
                  <div className="space-y-2 p-3" role="status" aria-label="Searching records">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-4/5" />
                    <Skeleton className="h-10 w-3/5" />
                    <span className="sr-only">Searching records...</span>
                  </div>
                ) : <div className="py-8 text-center text-sm text-muted-foreground" role="status">{error}</div>
              ) : canSearch ? (
                <>
                  {groupedResults.map(({ type, label, Icon, items }, index) => (
                    <Fragment key={type}>
                      {index > 0 && <CommandSeparator />}
                      <CommandGroup heading={label}>
                        {items.map((item) => (
                          <Fragment key={`${item.type}-${item.href}-${item.title}`}>
                            <CommandItem value={`${item.type}-${item.href}-${item.title}`} onSelect={() => navigateTo(item.href)}>
                              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate">{item.title}</span>
                                {item.detail && <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>}
                              </span>
                            </CommandItem>
                            {item.type === 'Client' && (
                              <CommandItem
                                value={`new invoice for ${item.title}`}
                                onSelect={() => navigateTo(`/invoices/new?client_id=${encodeURIComponent(item.href.split('/').at(-1))}`)}
                              >
                                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate">New invoice for {item.title}</span>
                              </CommandItem>
                            )}
                          </Fragment>
                        ))}
                      </CommandGroup>
                    </Fragment>
                  ))}
                  {!groupedResults.length && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground" role="status">
                      No matching records.
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {hasQuery ? 'Type at least two characters to search.' : 'Choose an action or type at least two characters to search.'}
                </div>
              )}
            </CommandList>
          </Command>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>Use arrows to navigate and Enter to open</span>
            <span className="flex items-center gap-1"><Kbd aria-hidden="true">Esc</Kbd><span>to close</span></span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
