function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function expandInvoiceTemplate(description, now = new Date()) {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return String(description)
    .replaceAll('{today}', formatLocalDate(now))
    .replaceAll('{yesterday}', formatLocalDate(yesterday))
    .replaceAll('{current_month}', monthNames[now.getMonth()])
    .replaceAll('{last_month}', monthNames[lastMonth.getMonth()])
    .replaceAll('{current_year}', String(now.getFullYear()));
}