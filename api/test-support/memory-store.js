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
  const invoiceEmailSends = [];
  return {
    async getSnapshot() {
      return snapshot;
    },
    async getClient(id) {
      return snapshot.clients.find((item) => item.id === Number(id));
    },
    async createClient(input) {
      const client = {
        id: Math.max(0, ...snapshot.clients.map((item) => item.id)) + 1,
        ...input,
        email: input.email_accounting || input.email || null
      };
      snapshot.clients.push(client);
      return client;
    },
    async updateClient(id, input) {
      const client = await this.getClient(id);
      if (client) Object.assign(client, input, { email: input.email_accounting ?? client.email });
      return client;
    },
    async deleteClient(id) {
      return removeById(snapshot.clients, id);
    },
    async getVendor(id) {
      return snapshot.vendors.find((item) => item.id === Number(id));
    },
    async createVendor(input) {
      const vendor = { id: Math.max(0, ...snapshot.vendors.map((item) => item.id)) + 1, ...input };
      snapshot.vendors.push(vendor);
      return vendor;
    },
    async updateVendor(id, input) {
      const vendor = await this.getVendor(id);
      if (vendor) Object.assign(vendor, input);
      return vendor;
    },
    async deleteVendor(id) {
      return removeById(snapshot.vendors, id);
    },
    async getYear(id) {
      return snapshot.years.find((item) => item.id === Number(id));
    },
    async createYear(input) {
      const year = { id: Math.max(0, ...snapshot.years.map((item) => item.id)) + 1, ...input };
      snapshot.years.push(year);
      return year;
    },
    async updateYear(id, input) {
      const year = await this.getYear(id);
      if (year) Object.assign(year, input);
      return year;
    },
    async deleteYear(id) {
      return removeById(snapshot.years, id);
    },
    async getExpense(id) {
      return snapshot.expenses.find((item) => item.id === Number(id));
    },
    async createExpense(input) {
      const expense = { id: Math.max(0, ...snapshot.expenses.map((item) => item.id)) + 1, ...input };
      snapshot.expenses.push(expense);
      return expense;
    },
    async createExpenses(inputs) {
      return inputs.map((input) => {
        const expense = { id: Math.max(0, ...snapshot.expenses.map((item) => item.id)) + 1, ...input };
        snapshot.expenses.push(expense);
        return expense;
      });
    },
    async updateExpense(id, input) {
      const expense = await this.getExpense(id);
      if (expense) Object.assign(expense, input);
      return expense;
    },
    async updateExpenses(records) {
      const expenses = records.map((record) => snapshot.expenses.find((item) => item.id === Number(record.id)));
      if (expenses.some((expense) => !expense)) return null;
      return records.map((record, index) => Object.assign(expenses[index], record));
    },
    async deleteExpense(id) {
      return removeById(snapshot.expenses, id);
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
    async getInvoice(id) {
      return snapshot.invoices.find((item) => item.id === Number(id));
    },
    async getInvoiceEmailSends(invoiceId) {
      return invoiceEmailSends
        .filter((send) => send.invoice_id === Number(invoiceId))
        .sort((first, second) => second.sent_at.localeCompare(first.sent_at) || second.id - first.id);
    },
    async recordInvoiceEmailSend(invoiceId, recipient) {
      const send = {
        id: Math.max(0, ...invoiceEmailSends.map((item) => item.id)) + 1,
        invoice_id: Number(invoiceId),
        recipient,
        sent_at: new Date().toISOString()
      };
      invoiceEmailSends.push(send);
      return send;
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
    async replaceInvoiceLines(invoiceId, inputs) {
      if (!snapshot.invoices.some((item) => item.id === Number(invoiceId))) return null;
      snapshot.lines = snapshot.lines.filter((line) => line.invoice_id !== Number(invoiceId));
      return Promise.all(inputs.map((input) => this.createInvoiceLine(invoiceId, input)));
    },
    async updateInvoice(id, updates) {
      const invoice = snapshot.invoices.find((item) => item.id === Number(id));
      if (invoice) Object.assign(invoice, updates);
      return invoice;
    },
    async deleteInvoice(id) {
      const invoiceId = Number(id);
      const removed = removeById(snapshot.invoices, invoiceId);
      if (removed) {
        snapshot.lines = snapshot.lines.filter((line) => line.invoice_id !== invoiceId);
        const sendIndexes = invoiceEmailSends.filter((send) => send.invoice_id === invoiceId);
        for (const send of sendIndexes) invoiceEmailSends.splice(invoiceEmailSends.indexOf(send), 1);
      }
      return removed;
    }
  };
}

function removeById(records, id) {
  const index = records.findIndex((item) => item.id === Number(id));
  if (index === -1) return false;
  records.splice(index, 1);
  return true;
}
