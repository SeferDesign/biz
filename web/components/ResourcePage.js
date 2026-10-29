import Link from 'next/link';
import { recordsPerPage } from '../lib/api.js';
import NewButton from './NewButton.js';
import { Button } from './ui/button.js';
import { Badge } from './ui/badge.js';
import { Alert, AlertDescription, AlertTitle } from './ui/alert.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';

export function ResourcePage({ title, description, data, error, columns, countLabel, count, hideHeading = false, actionHref, actionLabel, pageHref, page = 1, pageParam = 'page' }) {
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
            <h1>{title}</h1>
            <p className="page-description">{description}</p>
          </div>
          <div className="heading-actions">
            {actionHref && <NewButton href={actionHref} label={actionLabel || 'New record'} />}
          </div>
        </div>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">--</span>
          <h2>No records yet</h2>
          <p>This list will fill in as records are added to the ledger.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <Table className="data-table">
            <TableHeader>
              <TableRow>{columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {visibleRecords.map((record) => (
                <TableRow key={record.id}>
                  {columns.map((column, index) => (
                    <TableCell className={column.className || (index === 0 ? 'primary-cell' : '')} key={column.key}>
                      {column.render ? column.render(record) : (record[column.key] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pageHref && pageCount > 1 && !error && (
        <nav className="pagination" aria-label="Record pagination">
          {currentPage > 1
            ? <Button asChild size="sm" variant="outline"><Link href={hrefForPage(currentPage - 1)}>Previous</Link></Button>
            : <Button disabled size="sm" variant="outline">Previous</Button>}
          <span className="pagination-status">Page {currentPage} of {pageCount} · Showing {(currentPage - 1) * recordsPerPage + 1}–{Math.min(currentPage * recordsPerPage, records.length)} of {records.length}</span>
          {currentPage < pageCount
            ? <Button asChild size="sm" variant="outline"><Link href={hrefForPage(currentPage + 1)}>Next</Link></Button>
            : <Button disabled size="sm" variant="outline">Next</Button>}
        </nav>
      )}
    </>
  );
}

export function StatusBadge({ status }) {
  const value = String(status || 'draft').toLowerCase();
  const variant = {
    paid: 'success',
    succeeded: 'success',
    sent: 'warning',
    due: 'warning',
    processing: 'info',
    submitted: 'info',
    failed: 'destructive'
  }[value] || 'secondary';
  return <Badge className="uppercase" variant={variant}>{value}</Badge>;
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
