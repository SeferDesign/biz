import Link from 'next/link';
import { ResourcePage } from '../../components/ResourcePage.js';
import { formatMoney, parsePage } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

export default async function YearsPage({ searchParams }) {
  const params = await searchParams;
  const result = await getApiData('/years');
  return (
    <ResourcePage
      eyebrow="REPORTING / YEARS"
      title="Years"
      description="Tax rates, targets, and annual summaries."
      data={result.data}
      error={result.error}
      countLabel="years"
      actionHref="/years/new"
      actionLabel="New Year"
      pageHref="/years"
      page={parsePage(params?.page)}
      columns={[
        { key: 'year', label: 'Year', render: (year) => <Link className="table-link" href={`/years/${year.id}`}>{year.year}</Link> },
        { key: 'taxrate', label: 'Tax rate', render: (year) => `${(Number(year.taxrate || 0) * 100).toFixed(1)}%` },
        { key: 'goal_year', label: 'Annual goal', className: 'numeric-cell', render: (year) => formatMoney(year.goal_year) },
        { key: 'monthly_goal', label: 'Monthly goal', className: 'numeric-cell', render: (year) => formatMoney((Number(year.goal_year) || 0) / 12) }
      ]}
    />
  );
}
