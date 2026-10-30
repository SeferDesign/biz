'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from './ui/command.js';

export default function OmniSearch() {
  const router = useRouter();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
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
  }, [query]);

  useEffect(() => {
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  useEffect(() => {
    function toggleShortcut(event) {
      if (!event.metaKey || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      const input = inputRef.current;
      if (document.activeElement === input) {
        input.blur();
        setOpen(false);
      } else {
        input?.focus();
        input?.select();
      }
    }
    document.addEventListener('keydown', toggleShortcut);
    return () => document.removeEventListener('keydown', toggleShortcut);
  }, []);

  const showResults = open && canSearch;

  return (
    <div className="relative mx-auto h-11 w-full min-w-0 max-w-lg" ref={rootRef}>
      <Command className="absolute inset-x-0 top-0 z-50 h-auto border border-border pb-2 shadow-sm" shouldFilter={false} loop onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') setOpen(true);
      }}>
        <CommandInput
          ref={inputRef}
          aria-label="Search records"
          aria-expanded={showResults}
          aria-keyshortcuts="Meta+K"
          placeholder="Search records..."
          value={query}
          onFocus={() => { if (canSearch) setOpen(true); }}
          onValueChange={(value) => {
            setQuery(value);
            setResults([]);
            setLoading(value.trim().length >= 2);
            setError('');
            setOpen(true);
          }}
        >
          <CommandShortcut><kbd aria-hidden="true">⌘K</kbd></CommandShortcut>
        </CommandInput>
        <CommandList hidden={!showResults} label="Search results">
          {showResults && (loading || error ? (
            <div className="py-6 text-center text-sm" role="status">{loading ? 'Searching records...' : error}</div>
          ) : results.length ? (
            <CommandGroup heading={`${results.length} matching records`}>
              {results.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.href}-${item.title}`}
                  value={`${item.type}-${item.href}-${item.title}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.title}</span>
                    {item.detail && <span className="block truncate text-muted-foreground">{item.detail}</span>}
                  </span>
                  <CommandShortcut>{item.type}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty>No matching records.</CommandEmpty>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}
