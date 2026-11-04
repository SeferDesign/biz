// Spreadsheet apps execute cells starting with these characters as formulas.
const formulaPrefix = /^[=+\-@\t\r]/;
const csvSpecialCharacters = /[",\r\n]/;
const quotePattern = /"/g;

function csvCell(value) {
  if (value == null) return '';
  let text = String(value);
  if (typeof value === 'string' && formulaPrefix.test(text)) text = `'${text}`;
  return csvSpecialCharacters.test(text) ? `"${text.replace(quotePattern, '""')}"` : text;
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function sendCsv(res, filename, headers, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(toCsv(headers, rows));
}
