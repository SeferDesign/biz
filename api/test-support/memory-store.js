const initialSnapshot = {
  invoices: [
    { id: 1, client_id: 1, status: 'draft', total: 1200, cost: 1200, currency: 'USD', date: '2025-01-10' },
    { id: 2, client_id: 2, status: 'sent', total: 980.5, cost: 980.5, currency: 'USD', date: '2025-02-05' },
    { id: 3, client_id: 1, status: 'paid', total: 2150, cost: 2150, currency: 'USD', date: '2025-03-01', paiddate: '2025-03-15', paid: true }
  ],
  clients: [
    { id: 1, name: 'Acme Inc.', email: 'billing@acme.com' },
    { id: 2, name: 'Northwind', email: 'finance@northwind.example' }
  ],
  lines: [
    { id: 1, invoice_id: 1, description: 'Design retainer', amount: 600, total: 600 },
    { id: 2, invoice_id: 1, description: 'Development sprint', amount: 600, total: 600 },
    { id: 3, invoice_id: 2, description: 'Consulting hours', amount: 980.5, total: 980.5 }
  ],
  vendors: [
    { id: 1, name: 'Adobe', category: 'Software', notes: '' },
    { id: 2, name: 'Office Depot', category: 'Supplies', notes: '' }
  ],
  expenses: [
    { id: 1, name: 'Creative Cloud', vendor_id: 1, date: '2025-01-15', cost: 59.99, account: 'Business', notes: '' },
    { id: 2, name: 'Printer paper', vendor_id: 2, date: '2025-02-10', cost: 42.5, account: 'Business', notes: '' }
  ],
  years: [
    { id: 1, year: 2025, taxrate: 0.25, goal_year: 24000, goals_months: Array(12).fill(2000) },
    { id: 2, year: 2024, taxrate: 0.25, goal_year: 24000, goals_months: Array(12).fill(2000) }
  ]
};

export function createMemoryStore() {
  const snapshot = structuredClone(initialSnapshot);
  return {
    async getSnapshot() {
      return snapshot;
    },
    async createInvoice(input) {
      const paid = input.paid ?? input.status === 'paid';
      const invoice = {
        id: Math.max(0, ...snapshot.invoices.map((item) => item.id)) + 1,
        ...input,
        cost: input.cost ?? input.total ?? null,
        total: input.total ?? input.cost ?? null,
        paid,
        status: paid ? 'paid' : input.status || 'draft',
        currency: input.currency || 'USD'
      };
      snapshot.invoices.push(invoice);
      return invoice;
    },
    async createInvoiceLine(invoiceId, input) {
      const total = input.total ?? input.amount ?? null;
      const line = {
        id: Math.max(0, ...snapshot.lines.map((item) => item.id)) + 1,
        invoice_id: invoiceId,
        ...input,
        total,
        amount: total
      };
      snapshot.lines.push(line);
      return line;
    },
    async updateInvoice(id, updates) {
      const invoice = snapshot.invoices.find((item) => item.id === Number(id));
      if (invoice) Object.assign(invoice, updates);
      return invoice;
    }
  };
}
