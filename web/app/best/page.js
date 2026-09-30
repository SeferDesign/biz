import Link from 'next/link';
import { formatMoney } from '../../lib/api.js';
import { getApiData } from '../../lib/api-server.js';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function PerformanceTable({ title, columns, rows, emptyMessage }) {
  return (
    <section className="detail-section">
      <div className="section-heading"><h2>{title}</h2></div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>{columns.map((column) => <th className={column.numeric ? 'numeric-cell' : ''} key={column.label}>{column.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <td className={columns[index].numeric ? 'numeric-cell' : index === 0 ? 'primary-cell' : ''} key={columns[index].label}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="section-note">{emptyMessage}</p>}
    </section>
  );
}

export default async function BestPage() {
  const [invoiceResult, yearResult] = await Promise.all([
    getApiData('/invoices'),
    getApiData('/years')
  ]);
  const error = invoiceResult.error || yearResult.error;

  if (error) {
    return <div className="notice" role="alert"><strong>Performance data unavailable</strong><span>{error}</span></div>;
  }

  const years = Array.isArray(yearResult.data) ? yearResult.data : [];
  const invoices = Array.isArray(invoiceResult.data) ? invoiceResult.data : [];
  const incomeByPeriod = new Map();

  for (const invoice of invoices) {
    if (!(invoice.paid === true || invoice.status === 'paid') || !invoice.paiddate) continue;
    const paidDate = new Date(`${String(invoice.paiddate).slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(paidDate.getTime())) continue;
    const year = paidDate.getUTCFullYear();
    const month = paidDate.getUTCMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const amount = Number(invoice.cost ?? invoice.total ?? 0);

    for (const key of [`month:${year}:${month}`, `quarter:${year}:${quarter}`, `year:${year}`]) {
      incomeByPeriod.set(key, (incomeByPeriod.get(key) || 0) + amount);
    }
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  const yearLink = (year) => <Link className="table-link" href={`/years/${year.id}`}>{year.year}</Link>;
  const months = years.flatMap((year) => monthNames.map((name, index) => {
    const month = index + 1;
    return {
      key: `${year.year}-${month}`,
      year,
      month,
      name,
      income: incomeByPeriod.get(`month:${year.year}:${month}`) || 0
    };
  })).sort((left, right) => right.income - left.income).slice(0, 8);
  const quarters = years.flatMap((year) => [1, 2, 3, 4].map((quarter) => ({
    key: `${year.year}-Q${quarter}`,
    year,
    quarter,
    income: incomeByPeriod.get(`quarter:${year.year}:${quarter}`) || 0
  }))).sort((left, right) => right.income - left.income).slice(0, 8);
  const annual = years.map((year) => ({
    key: String(year.id),
    year,
    income: incomeByPeriod.get(`year:${year.year}`) || 0
  })).sort((left, right) => right.income - left.income).slice(0, 4);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Best Performances</h1>
          <p className="page-description">The strongest paid-income periods across the ledger.</p>
        </div>
      </div>

      {!years.length && <div className="empty-state"><h2>No year records yet</h2><p>Performance rankings appear once years are added to the ledger.</p></div>}
      {Boolean(years.length) && <>
        <PerformanceTable
          title="Months"
          columns={[{ label: 'Month' }, { label: 'Total income', numeric: true }]}
          rows={months.map(({ key, year, month, name, income }) => ({
            key,
            cells: [
              <>{yearLink(year)} - {name}{currentYear === year.year && currentMonth === month ? ' *' : ''}</>,
              formatMoney(income)
            ]
          }))}
          emptyMessage="No monthly income to rank."
        />
        <PerformanceTable
          title="Quarters"
          columns={[{ label: 'Quarter' }, { label: 'Per-month average', numeric: true }, { label: 'Total income', numeric: true }]}
          rows={quarters.map(({ key, year, quarter, income }) => ({
            key,
            cells: [
              <>{yearLink(year)} - Q{quarter}{currentYear === year.year && currentQuarter === quarter ? ' *' : ''}</>,
              formatMoney(income / 3),
              formatMoney(income)
            ]
          }))}
          emptyMessage="No quarterly income to rank."
        />
        <PerformanceTable
          title="Years"
          columns={[{ label: 'Year' }, { label: 'Per-month average', numeric: true }, { label: 'Total income', numeric: true }]}
          rows={annual.map(({ key, year, income }) => ({
            key,
            cells: [
              <>{yearLink(year)}{currentYear === year.year ? ' *' : ''}</>,
              formatMoney(income / 12),
              formatMoney(income)
            ]
          }))}
          emptyMessage="No annual income to rank."
        />
      </>}
    </>
  );
}
