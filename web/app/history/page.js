import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import HistoryFilter from '../../components/HistoryFilter.js';
import { formatDateTime, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export const metadata = { title: 'Change History' };

const entityTypes = ['client', 'invoice', 'expense', 'vendor', 'year'];

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'object' && item !== null
      ? `${item.description || 'Line item'} (${displayValue(item.total)})`
      : String(item)).join(', ') || 'None';
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function describeChanges(changes) {
  return Object.entries(changes || {}).map(([field, change]) => {
    const label = field.replaceAll('_', ' ');
    return `${label}: ${displayValue(change.from)} → ${displayValue(change.to)}`;
  }).join('; ');
}

function entityHref(record) {
  const paths = {
    client: '/clients',
    invoice: '/invoices',
    expense: '/expenses',
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
        columns={[
          { key: 'created_at', label: 'When', className: 'date-cell', render: (record) => formatDateTime(record.created_at) },
          { key: 'entity', label: 'Record', render: (record) => {
            const href = entityHref(record);
            const label = `${record.entity_type.replaceAll('_', ' ')} #${record.entity_id}`;
            return href ? <Link className="table-link" href={href}>{label}</Link> : label;
          } },
          { key: 'action', label: 'Action', render: (record) => record.action.replaceAll('_', ' ') },
          { key: 'actor', label: 'By', render: (record) => record.actor_email || record.source.replaceAll('_', ' ') },
          { key: 'changes', label: 'Changes', render: (record) => describeChanges(record.changes) }
        ]}
      />
    </>
  );
}
