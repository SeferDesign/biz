export function ResourcePage({ eyebrow, title, description, data, error, columns, countLabel, count, hideHeading = false }) {
  const records = Array.isArray(data) ? data : [];
  const itemCount = count ?? records.length;

  return (
    <>
      {!hideHeading && (
        <div className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="page-description">{description}</p>
          </div>
          {!error && (
            <div className="heading-count">
              <strong>{itemCount.toLocaleString('en-US')}</strong>
              <span>{countLabel || 'records'}</span>
            </div>
          )}
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
              {records.map((record) => (
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