import { Router } from 'express';
import { displayId } from '@seferbiz/company';
const whitespacePattern = /\s+/;

function matchRank(query, primaryValues, secondaryValues = []) {
  const words = query.split(whitespacePattern).filter(Boolean);
  const primary = primaryValues.filter(Boolean).join(' ').toLowerCase();
  const searchable = [...primaryValues, ...secondaryValues].filter(Boolean).join(' ').toLowerCase();
  if (words.every((word) => primary.includes(word))) return 2;
  if (words.every((word) => searchable.includes(word))) return 1;
  return 0;
}

function result(type, title, detail, href, rank) {
  return { type, title, detail, href, rank };
}

export default function searchRouter(store) {
  const router = Router();

  router.get('/search', async (req, res) => {
    const query = String(req.query.q || '').trim().toLowerCase();
    if (query.length < 2) return res.status(400).json({ error: 'Search query must contain at least 2 characters' });
    if (query.length > 100) return res.status(400).json({ error: 'Search query must be at most 100 characters' });

    const records = await store.searchRecords(query);
    const clientsById = new Map(records.clients.map((client) => [Number(client.id), client]));
    const vendorsById = new Map(records.vendors.map((vendor) => [Number(vendor.id), vendor]));
    const invoicesById = new Map(records.invoices.map((invoice) => [Number(invoice.id), invoice]));
    const matches = [];

    for (const client of records.clients) {
      const rank = matchRank(query, [client.name], [client.contact, client.email_accounting, client.city]);
      if (rank) matches.push(result('Client', client.name || 'Unnamed client', [client.contact, client.city, client.state].filter(Boolean).join(' · '), `/clients/${client.id}`, rank));
    }

    for (const vendor of records.vendors) {
      const rank = matchRank(query, [vendor.name], [vendor.category, vendor.notes]);
      if (rank) matches.push(result('Vendor', vendor.name || 'Unnamed vendor', vendor.category || 'Vendor', `/vendors/${vendor.id}`, rank));
    }

    for (const expense of records.expenses) {
      const vendor = vendorsById.get(Number(expense.vendor_id)) || { name: expense.vendor_name };
      const rank = matchRank(query, [expense.name], [vendor?.name, expense.account, expense.notes, expense.date]);
      if (rank) {
        const detail = [vendor?.name, expense.date, expense.account].filter(Boolean).join(' · ');
        matches.push(result('Expense', expense.name || 'Unnamed expense', detail, `/expenses/${expense.id}`, rank));
      }
    }

    for (const invoice of records.invoices) {
      const client = clientsById.get(Number(invoice.client_id)) || { name: invoice.client_name };
      const invoiceNumber = displayId(client?.name, invoice.id);
      const rank = matchRank(query, [invoice.description, invoiceNumber], [client?.name, invoice.normalized_status || invoice.status, invoice.date, invoice.paymenttype]);
      if (rank) {
        const detail = [invoiceNumber, client?.name, invoice.normalized_status || invoice.status, invoice.date].filter(Boolean).join(' · ');
        matches.push(result('Invoice', invoice.description || invoiceNumber, detail, `/invoices/${invoice.id}`, rank));
      }
    }

    for (const line of records.lines) {
      const rank = matchRank(query, [line.description]);
      if (rank) {
        const invoice = invoicesById.get(Number(line.invoice_id));
        const client = invoice
          ? clientsById.get(Number(invoice.client_id)) || { name: line.client_name }
          : line.client_name ? { name: line.client_name } : null;
        const invoiceNumber = displayId(client?.name, line.invoice_id);
        matches.push(result('Line item', line.description || 'Invoice line', invoiceNumber, `/invoices/${line.invoice_id}`, rank));
      }
    }

    for (const year of records.years) {
      const title = String(year.year);
      const rank = matchRank(query, [title]);
      if (rank) matches.push(result('Year', title, 'Financial year', `/years/${year.year}`, rank));
    }

    matches.sort((left, right) => right.rank - left.rank || left.title.localeCompare(right.title));
    return res.json({ results: matches.slice(0, 12).map(({ rank, ...item }) => item) });
  });

  return router;
}
