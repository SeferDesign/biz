const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
const shortMonthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const dayMs = 24 * 60 * 60 * 1000;

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isPaidInvoice(invoice) {
  return invoice.paid === true || invoice.status === 'paid';
}

export function invoiceAmount(invoice) {
  return Number(invoice.cost ?? invoice.total ?? 0);
}

function monthEntry(date, labelFormat) {
  return {
    key: date.toISOString().slice(0, 7),
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    label: labelFormat.format(date)
  };
}

// Months end with the current UTC month, oldest first.
export function trailingMonths(count, now = new Date()) {
  return Array.from({ length: count }, (_, index) => (
    monthEntry(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1)), monthName)
  ));
}

export function calendarMonths(year) {
  return Array.from({ length: 12 }, (_, index) => monthEntry(new Date(Date.UTC(year, index, 1)), shortMonthName));
}

export function daysInYear(year) {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / dayMs;
}

// Counts today as elapsed; past years are complete and future years have not started.
export function daysElapsed(year, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const elapsed = Math.floor((today - Date.UTC(year, 0, 1)) / dayMs) + 1;
  return Math.min(Math.max(elapsed, 0), daysInYear(year));
}

// Revenue per elapsed day, annualized, then spread across 12 months.
export function monthlyRunRate(total, year, now = new Date()) {
  const elapsed = daysElapsed(year, now);
  return elapsed > 0 && total > 0 ? roundMoney((total / elapsed) * daysInYear(year) / 12) : null;
}

export function totalsByCategory(expenses, vendors) {
  const categories = new Map(vendors.map((vendor) => [vendor.id, vendor.category || 'Uncategorized']));
  const totals = totalsByKey(expenses, (expense) => categories.get(expense.vendor_id) || 'Uncategorized', (expense) => expense.cost);
  return [...totals]
    .map(([name, value]) => ({ name, value: roundMoney(value) }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
}

export function onOrBefore(records, dateOf, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return records.filter((record) => String(dateOf(record) || '').slice(0, 10) <= today);
}

export function totalsByMonth(records, dateOf, amountOf) {
  const totals = new Map();
  for (const record of records) {
    const key = String(dateOf(record) || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    totals.set(key, (totals.get(key) || 0) + Number(amountOf(record) || 0));
  }
  return totals;
}

function totalsByKey(records, keyOf, amountOf) {
  const totals = new Map();
  for (const record of records) {
    const key = keyOf(record);
    totals.set(key, (totals.get(key) || 0) + Number(amountOf(record) || 0));
  }
  return totals;
}

export function monthlyGoal(years, year, month) {
  const goal = Number(years.find((item) => Number(item.year) === year)?.goals_months?.[month - 1]);
  return goal > 0 ? goal : null;
}

// IRS estimated-tax payment periods, as [first, last] month; they differ from calendar quarters.
const taxPaymentPeriods = [[1, 3], [4, 5], [6, 8], [9, 12]];

function revenueBetween(monthlyRows, first, last) {
  return roundMoney(monthlyRows.slice(first - 1, last).reduce((total, row) => total + row.revenue, 0));
}

// monthlyRows: the 12 calendar-month rows from monthlyFinances.
export function quarterlyTaxes(monthlyRows, taxrate) {
  const rate = Number(taxrate || 0);
  return taxPaymentPeriods.map(([paymentFirst, paymentLast], index) => {
    const income = revenueBetween(monthlyRows, index * 3 + 1, index * 3 + 3);
    return {
      quarter: index + 1,
      firstMonth: monthName.format(new Date(Date.UTC(2000, index * 3, 1))),
      lastMonth: monthName.format(new Date(Date.UTC(2000, index * 3 + 2, 1))),
      income,
      taxEstimate: roundMoney(income * rate),
      paymentEstimate: roundMoney(revenueBetween(monthlyRows, paymentFirst, paymentLast) * rate)
    };
  });
}

export function monthlyFinances(months, { invoices = [], expenses = [], years = [] }) {
  const revenue = totalsByMonth(invoices.filter(isPaidInvoice), (invoice) => invoice.paiddate || invoice.date, invoiceAmount);
  const spending = totalsByMonth(expenses, (expense) => expense.date, (expense) => expense.cost);
  return months.map(({ key, year, month, label }) => {
    const monthRevenue = roundMoney(revenue.get(key) || 0);
    const monthExpenses = roundMoney(spending.get(key) || 0);
    return {
      label,
      revenue: monthRevenue,
      expenses: monthExpenses,
      // Stacked on expenses so the column's full height equals revenue.
      revenueOverExpenses: roundMoney(Math.max(monthRevenue - monthExpenses, 0)),
      goal: monthlyGoal(years, year, month)
    };
  });
}
