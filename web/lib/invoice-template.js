function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function expandInvoiceTemplate(description, now = new Date()) {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return String(description)
    .replaceAll('{today}', formatLocalDate(now))
    .replaceAll('{yesterday}', formatLocalDate(yesterday));
}