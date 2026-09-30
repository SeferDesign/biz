'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { browserApiBaseUrl } from '../lib/api.js';

export default function OmniSearch() {
  const router = useRouter();
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setError('');
      setActiveIndex(-1);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${browserApiBaseUrl}/v1/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || `Search failed (${response.status})`);
        setResults(body.results || []);
        setOpen(true);
      } catch (cause) {
        if (cause.name !== 'AbortError') {
          setResults([]);
          setError('Search is temporarily unavailable.');
          setOpen(true);
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

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      router.push(results[activeIndex].href);
      setOpen(false);
    }
  }

  const showResults = open && canSearch;

  return (
    <div className="omni-search" ref={rootRef}>
      <label className="omni-search-field">
        <span className="search-mark" aria-hidden="true">⌕</span>
        <input
          type="search"
          role="combobox"
          aria-label="Search records"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls="omni-search-results"
          aria-activedescendant={activeIndex >= 0 ? `omni-result-${activeIndex}` : undefined}
          placeholder="Search records..."
          value={query}
          onFocus={() => { if (canSearch) setOpen(true); }}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
        />
        {loading && <span className="search-loading" aria-label="Searching" />}
      </label>
      {showResults && (
        <div className="omni-results" id="omni-search-results" role="listbox" aria-label="Search results">
          {loading ? (
            <div className="omni-message">Searching records...</div>
          ) : error ? (
            <div className="omni-message omni-error" role="status">{error}</div>
          ) : results.length ? (
            <>
              <div className="omni-results-heading">{results.length} matching records</div>
              {results.map((item, index) => (
                <Link
                  className={`omni-result${index === activeIndex ? ' is-active' : ''}`}
                  href={item.href}
                  id={`omni-result-${index}`}
                  key={`${item.type}-${item.href}-${item.title}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => setOpen(false)}
                >
                  <span className="omni-result-copy">
                    <strong>{item.title}</strong>
                    {item.detail && <span>{item.detail}</span>}
                  </span>
                  <span className="omni-result-type">{item.type}</span>
                </Link>
              ))}
            </>
          ) : (
            <div className="omni-message">No matching records.</div>
          )}
        </div>
      )}
    </div>
  );
}