export function findYear(id, years) {
  return years.find((item) => item.id === Number(id) || String(item.year) === String(id));
}

export function invoiceDate(invoice) {
  return invoice.paiddate || invoice.date;
}

export function isPaid(invoice) {
  return invoice.paid === true || invoice.status === 'paid';
}

export function invoiceAmount(invoice) {
  return Number(invoice.cost ?? invoice.total ?? 0);
}

export function sum(values) {
  const total = values.reduce((result, value) => result + Number(value || 0), 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function yearIncome(year, invoices) {
  return invoices.filter((invoice) => {
    const date = invoiceDate(invoice);
    return isPaid(invoice) && date && new Date(`${date}T00:00:00Z`).getUTCFullYear() === year;
  });
}

export function yearExpenses(year, expenses) {
  return expenses.filter((expense) => new Date(`${expense.date}T00:00:00Z`).getUTCFullYear() === year);
}
