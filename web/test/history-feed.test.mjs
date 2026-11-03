import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const { loadBindings, transformSync } = require('next/dist/build/swc');
await loadBindings();
process.env.NEXT_PUBLIC_API_URL ||= 'https://api.example.test';
const webRoot = path.resolve(import.meta.dirname, '..');
const records = [
  {
    id: 3, entity_type: 'expense', entity_id: 1, entity_name: 'Creative Cloud subscription',
    vendor_name: 'Adobe', action: 'updated', actor_email: 'owner@example.com',
    actor_first_name: 'Alex', actor_last_name: 'Smith',
    created_at: '2026-11-03T08:32:00Z',
    changes: { cost: { from: 59, to: 69 }, notes: { from: 'Old plan', to: 'Annual plan\nExtra storage' } }
  },
  {
    id: 2, entity_type: 'client', entity_id: 1,
    entity_name: 'A very long client name that should wrap naturally without overflowing on mobile',
    action: 'created', source: 'api_access_token', created_at: '2026-11-03T08:00:00Z',
    changes: { name: { from: null, to: 'Acme Inc.' } }
  },
  {
    id: 1, entity_type: 'recurring_expense', entity_id: 2, action: 'deleted',
    source: 'api_access_token', created_at: '2026-11-03T07:00:00Z',
    changes: { name: { from: 'Tomorrow visibility smoke test', to: null } }
  }
];
const modules = new Map();

function loadComponent(filename) {
  if (filename === path.join(webRoot, 'lib/api-server.js')) {
    return { getApiData: async () => ({ data: { items: records, total: 45 } }) };
  }
  if (filename === path.join(webRoot, 'components/HistoryFilter.js')) {
    return { __esModule: true, default: () => null };
  }
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' }
  });
  const resolveModule = (specifier) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
    let resolved = specifier.startsWith('@/')
      ? path.join(webRoot, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    if (!path.extname(resolved)) resolved += '.js';
    return loadComponent(resolved);
  };
  new Function('require', 'module', 'exports', code)(resolveModule, module, module.exports);
  return module.exports;
}

test('history renders an expandable feed with filtered pagination and one-sided creation/deletion diffs', async () => {
  const HistoryPage = loadComponent(path.join(webRoot, 'app/history/page.js')).default;
  const markup = renderToStaticMarkup(await HistoryPage({ searchParams: Promise.resolve({ entity_type: 'expense' }) }));
  assert.equal(markup.includes('<table'), false);
  assert.equal((markup.match(/<details/g) || []).length, 3);
  assert.equal((markup.match(/<details[^>]* open/g) || []).length, 1);
  assert.ok(markup.includes('/history?entity_type=expense&amp;page=2'));
  assert.ok(markup.includes('Creative Cloud subscription / Adobe'));
  assert.ok(markup.includes('By Alex Smith (owner@example.com)'));
  assert.equal(markup.includes('(empty)'), false);
  assert.ok(markup.includes('Annual plan\nExtra storage'));

  if (process.env.HISTORY_PREVIEW_PATH) {
    const postcss = require('postcss');
    const tailwind = require('@tailwindcss/postcss');
    const stylesheet = path.join(webRoot, 'app/globals.css');
    const css = await postcss([tailwind({ base: webRoot })]).process(readFileSync(stylesheet, 'utf8'), { from: stylesheet });
    writeFileSync(process.env.HISTORY_PREVIEW_PATH, `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css.css}</style></head><body><main style="max-width:1100px;margin:auto;padding:24px">${markup}</main></body></html>`);
  }
});
