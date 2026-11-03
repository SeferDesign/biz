import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ResourcePage } from '../../components/ResourcePage.js';
import HistoryFilter from '../../components/HistoryFilter.js';
import { formatDateTime, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';
import { formatHistoryValue, historyActorLabel, historyChangeSides, historyRecordLabel } from '../../lib/history-diff.js';

export const metadata = { title: 'Change History' };

const entityTypes = ['client', 'invoice', 'expense', 'recurring_expense', 'vendor', 'year'];

function describeChanges(changes, action) {
  const entries = Object.entries(changes || {});
  if (!entries.length) return <span className="text-muted-foreground">No field changes</span>;

  return (
    <dl className="history-diff">
      {entries.map(([field, change]) => (
        <div className="history-diff-field" key={field}>
          <dt className="history-diff-label">{field.replaceAll('_', ' ')}</dt>
          {historyChangeSides(action).map((side) => (
            <dd className={`history-diff-value history-diff-${side}`} key={side}>
              <span className="sr-only">{side === 'from' ? 'Previous value: ' : 'New value: '}</span>
              <span className="history-diff-marker" aria-hidden="true">{side === 'from' ? '-' : '+'}</span>
              <span>{formatHistoryValue(change[side])}</span>
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

function entityHref(record) {
  const paths = {
    client: '/clients',
    invoice: '/invoices',
    expense: '/expenses',
    recurring_expense: '/expenses/recurring',
    vendor: '/vendors',
    year: '/years'
  };
  return paths[record.entity_type] ? `${paths[record.entity_type]}/${record.entity_id}` : null;
}

export default async function HistoryPage({ searchParams }) {
  const params = await searchParams;
  const page = parsePage(params?.page);
  const entityType = entityTypes.includes(params?.entity_type) ? params.entity_type : '';
  const query = new URLSearchParams({ page: String(page) });
  if (entityType) query.set('entity_type', entityType);
  const result = await getApiData(`/history?${query}`);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Change History</h1>
          <p className="page-description">Business record activity</p>
        </div>
      </div>
      <HistoryFilter value={entityType} />
      <ResourcePage
        hideHeading
        data={result.data?.items}
        total={result.data?.total}
        error={result.error}
        countLabel="changes"
        pageHref={entityType ? `/history?entity_type=${encodeURIComponent(entityType)}` : '/history'}
        page={page}
        renderRecords={(records) => (
          <ol className="history-feed" aria-label="Record activity">
            {records.map((record, index) => {
              const href = entityHref(record);
              const label = historyRecordLabel(record);
              const fieldCount = Object.keys(record.changes || {}).length;
              return (
                <li className="history-event" key={record.id}>
                  <article>
                    <header className="history-event-header">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="capitalize text-muted-foreground">{record.entity_type.replaceAll('_', ' ')}</span>
                          <span className="font-medium capitalize">{record.action.replaceAll('_', ' ')}</span>
                        </div>
                        <h2 className="history-event-title">
                          {href ? <Link className="hover:underline underline-offset-4" href={href}>{label}</Link> : label}
                        </h2>
                      </div>
                      <div className="history-event-meta">
                        <time>{formatDateTime(record.created_at)}</time>
                        <span>By {historyActorLabel(record)}</span>
                      </div>
                    </header>
                    <details className="history-event-details" open={index === 0}>
                      <summary>
                        <ChevronRight className="history-event-chevron" size={14} aria-hidden="true" />
                        <span className="history-show-changes">Show changes</span>
                        <span className="history-hide-changes">Hide changes</span>
                        <span className="text-muted-foreground">{fieldCount} {fieldCount === 1 ? 'field' : 'fields'}</span>
                      </summary>
                      {describeChanges(record.changes, record.action)}
                    </details>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      />
    </>
  );
}
