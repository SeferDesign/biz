import { recordsPerPage } from '../lib/api.js';
import NewButton from './NewButton.js';
import { Badge } from './ui/badge.js';
import { Alert, AlertDescription, AlertTitle } from './ui/alert.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from './ui/empty.js';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from './ui/pagination.js';

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
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No records yet</EmptyTitle>
            <EmptyDescription>This list will fill in as records are added to the ledger.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="table-wrap">
          <Table className="data-table">
            <TableHeader>
              <TableRow>{columns.map((column) => <TableHead className={column.className?.split(/\s+/).includes('numeric-cell') ? 'numeric-cell' : undefined} key={column.key}>{column.label}</TableHead>)}</TableRow>
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
        <Pagination aria-label="Record pagination">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={hrefForPage(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage === 1}
                tabIndex={currentPage === 1 ? -1 : undefined}
              />
            </PaginationItem>
            <PaginationItem>
              <span>Page {currentPage} of {pageCount} · Showing {(currentPage - 1) * recordsPerPage + 1}–{Math.min(currentPage * recordsPerPage, records.length)} of {records.length}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={hrefForPage(Math.min(pageCount, currentPage + 1))}
                aria-disabled={currentPage === pageCount}
                tabIndex={currentPage === pageCount ? -1 : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
