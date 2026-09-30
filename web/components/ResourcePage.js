import Link from 'next/link';
import { recordsPerPage } from '../lib/api.js';

export function ResourcePage({ eyebrow, title, description, data, error, columns, countLabel, count, hideHeading = false, actionHref, actionLabel, pageHref, page = 1, pageParam = 'page' }) {
  const records = Array.isArray(data) ? data : [];
  const itemCount = count ?? records.length;
  const pageCount = Math.max(1, Math.ceil(records.length / recordsPerPage));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = pageHref
    ? records.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage)
    : records;
  const hrefForPage = (nextPage) => {
    const [pathname, query = ''] = pageHref.split('?');
    const params = new URLSearchParams(query);
    params.set(pageParam, String(nextPage));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <>
      {!hideHeading && (
        <div className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="page-description">{description}</p>
          </div>
          <div className="heading-actions">
            {actionHref && <Link className="primary-button" href={actionHref}>{actionLabel || 'New record'}</Link>}
            {!error && (
              <div className="heading-count">
                <strong>{itemCount.toLocaleString('en-US')}</strong>
                <span>{countLabel || 'records'}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {error ? (
        <div className="notice" role="alert">
          <strong>Data unavailable</strong>
          <span>{error}</span>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">--</span>
          <h2>No records yet</h2>
          <p>This list will fill in as records are added to the ledger.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  {columns.map((column, index) => (
                    <td className={column.className || (index === 0 ? 'primary-cell' : '')} key={column.key}>
                      {column.render ? column.render(record) : (record[column.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageHref && pageCount > 1 && !error && (
        <nav className="pagination" aria-label="Record pagination">
          {currentPage > 1
            ? <Link className="pagination-link" href={hrefForPage(currentPage - 1)}>Previous</Link>
            : <span className="pagination-link is-disabled" aria-disabled="true">Previous</span>}
          <span className="pagination-status">Page {currentPage} of {pageCount} · Showing {(currentPage - 1) * recordsPerPage + 1}–{Math.min(currentPage * recordsPerPage, records.length)} of {records.length}</span>
          {currentPage < pageCount
            ? <Link className="pagination-link" href={hrefForPage(currentPage + 1)}>Next</Link>
            : <span className="pagination-link is-disabled" aria-disabled="true">Next</span>}
        </nav>
      )}
    </>
  );
}

export function StatusLabel({ status }) {
  const value = String(status || 'draft').toLowerCase();
  return <span className={`status-label status-${value}`}>{value}</span>;
}

export function DetailGrid({ items }) {
  return (
    <dl className="detail-grid">
      {items.map(([label, value]) => (
        <div className="detail-item" key={label}>
          <dt>{label}</dt>
          <dd>{value || '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
