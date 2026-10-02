const initialSnapshot = {
  invoices: [
    { id: 1, client_id: 1, status: 'draft', total: 1200, cost: 1200, currency: 'USD', date: '2025-01-10', created_at: '2025-01-10T00:00:00Z' },
    { id: 2, client_id: 2, status: 'sent', total: 980.5, cost: 980.5, currency: 'USD', date: '2025-02-05', created_at: '2025-02-05T00:00:00Z' },
    { id: 3, client_id: 1, status: 'paid', total: 2150, cost: 2150, currency: 'USD', date: '2025-03-01', paiddate: '2025-03-15', paid: true, created_at: '2025-03-01T00:00:00Z' }
  ],
  clients: [
    { id: 1, name: 'Acme Inc.', email: 'billing@acme.com', payment_terms: 'Net 15', created_at: '2025-01-01T00:00:00Z' },
    { id: 2, name: 'Northwind', email: 'finance@northwind.example', payment_terms: 'Net 15', created_at: '2025-01-02T00:00:00Z' }
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
  const invoicePayments = [];
  const users = [];
  const apiKeys = [];
  return {
    users,
    invoicePayments,
    async getUserByEmail(email) {
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    },
    async getUserPassword(id) {
      const user = users.find((item) => item.id === Number(id));
      return user ? { id: user.id, encrypted_password: user.encrypted_password } : undefined;
    },
    async getUserProfile(id) {
      const user = users.find((item) => item.id === Number(id));
      return user ? {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      } : undefined;
    },
    async updateUserProfile(id, { first_name, last_name }) {
      const user = users.find((item) => item.id === Number(id));
      if (!user) return undefined;
      user.first_name = first_name;
      user.last_name = last_name;
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      };
    },
    async updateUserPassword(id, encryptedPassword) {
      const user = users.find((item) => item.id === Number(id));
      if (user) Object.assign(user, { encrypted_password: encryptedPassword, reset_password_token: null, reset_password_sent_at: null });
    },
    async createPasswordReset(id, tokenDigest) {
      const user = users.find((item) => item.id === Number(id));
      if (user) Object.assign(user, { reset_password_token: tokenDigest, reset_password_sent_at: new Date() });
    },
    async consumePasswordReset(tokenDigest, encryptedPassword) {
      const user = users.find((item) => item.reset_password_token === tokenDigest);
      if (!user || !user.reset_password_sent_at || Date.now() - new Date(user.reset_password_sent_at).getTime() > 6 * 60 * 60 * 1000) return false;
      Object.assign(user, { encrypted_password: encryptedPassword, reset_password_token: null, reset_password_sent_at: null });
      return true;
    },
    async recordUserSignIn() {},
    async consumeUserOtp(id, timestep) {
      const user = users.find((item) => item.id === Number(id));
      if (!user || Number(user.consumed_timestep) === timestep) return false;
      user.consumed_timestep = timestep;
      return true;
    },
    async getUserOtpSettings(id) {
      const user = users.find((item) => item.id === Number(id));
      return user ? {
        id: user.id,
        otp_required_for_login: user.otp_required_for_login,
        encrypted_otp_secret: user.encrypted_otp_secret,
        encrypted_otp_secret_iv: user.encrypted_otp_secret_iv,
        encrypted_otp_secret_salt: user.encrypted_otp_secret_salt,
        consumed_timestep: user.consumed_timestep
      } : undefined;
    },
    async saveUserOtpSecret(id, secret) {
      const user = users.find((item) => item.id === Number(id));
      if (!user || user.otp_required_for_login) return false;
      Object.assign(user, secret, { consumed_timestep: null });
      return true;
    },
    async enableUserOtp(id) {
      const user = users.find((item) => item.id === Number(id));
      if (!user || !user.encrypted_otp_secret) return false;
      user.otp_required_for_login = true;
      return true;
    },
    async disableUserOtp(id) {
      const user = users.find((item) => item.id === Number(id));
      if (user) Object.assign(user, {
        otp_required_for_login: false,
        encrypted_otp_secret: null,
        encrypted_otp_secret_iv: null,
        encrypted_otp_secret_salt: null,
        consumed_timestep: null
      });
    },
    async getApiKeysByUser(userId) {
      return apiKeys
        .filter((key) => key.user_id === Number(userId))
        .sort((left, right) => right.id - left.id);
    },
    async createApiKey(userId, input) {
      if (apiKeys.some((item) => item.key === input.key)) {
        const error = new Error('Duplicate entry');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      const now = new Date().toISOString();
      const apiKey = {
        id: Math.max(0, ...apiKeys.map((item) => item.id)) + 1,
        user_id: Number(userId),
        label: input.label,
        key: input.key,
        last_used_at: null,
        created_at: now,
        updated_at: now
      };
      apiKeys.push(apiKey);
      return apiKey;
    },
    async updateApiKey(userId, id, updates) {
      const apiKey = apiKeys.find((item) => item.id === Number(id) && item.user_id === Number(userId));
      if (!apiKey) return undefined;
      const nextKeyValue = updates.key === undefined ? apiKey.key : updates.key;
      if (nextKeyValue !== apiKey.key && apiKeys.some((item) => item.key === nextKeyValue)) {
        const error = new Error('Duplicate entry');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      Object.assign(apiKey, {
        ...(updates.label === undefined ? {} : { label: updates.label }),
        ...(updates.key === undefined ? {} : { key: updates.key }),
        updated_at: new Date().toISOString()
      });
      return apiKey;
    },
    async deleteApiKey(userId, id) {
      const index = apiKeys.findIndex((item) => item.id === Number(id) && item.user_id === Number(userId));
      if (index === -1) return false;
      apiKeys.splice(index, 1);
      return true;
    },
    async touchApiKeyLastUsed(key) {
      const apiKey = apiKeys.find((item) => item.key === key);
      if (!apiKey) return false;
      apiKey.last_used_at = new Date().toISOString();
      apiKey.updated_at = new Date().toISOString();
      return true;
    },
    async getSnapshot() {
      return {
        ...snapshot,
        clients: sortClientsByRecentActivity(snapshot.clients, snapshot.invoices)
      };
    },
    async getClient(id) {
      return snapshot.clients.find((item) => item.id === Number(id));
    },
    async createClient(input) {
      const client = {
        id: Math.max(0, ...snapshot.clients.map((item) => item.id)) + 1,
        payment_terms: 'Net 15',
        created_at: new Date().toISOString(),
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
    async setClientStripeCustomerId(id, customerId) {
      const client = await this.getClient(id);
      if (client) client.stripe_customer_id = customerId;
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
        created_at: new Date().toISOString(),
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
    },
    async ensureInvoiceAccessToken(id) {
      const invoice = await this.getInvoice(id);
      if (invoice && !invoice.access_token) invoice.access_token = `invoice-token-${invoice.id}`;
      return invoice?.access_token;
    },
    async setInvoiceStripeSession(id, sessionId) {
      const invoice = await this.getInvoice(id);
      if (invoice) invoice.stripe_session_id = sessionId;
    },
    async markInvoicePaid(id, { paiddate, paymenttype }) {
      const invoice = await this.getInvoice(id);
      if (!invoice || invoice.paid) return false;
      Object.assign(invoice, { paid: true, status: 'paid', paiddate, paymenttype });
      return true;
    },
    async getInvoicePayments(invoiceId) {
      return invoicePayments.filter((payment) => payment.invoice_id === Number(invoiceId)).reverse();
    },
    async recordInvoicePayment(payment) {
      let existing = invoicePayments.find((item) => item.stripe_checkout_session_id === payment.stripe_checkout_session_id);
      let changed = true;
      if (!existing) {
        existing = { id: invoicePayments.length + 1, submitted_at: new Date().toISOString(), ...payment };
        invoicePayments.push(existing);
      } else if (!['succeeded', 'failed'].includes(existing.status) && existing.status !== payment.status) {
        Object.assign(existing, payment);
      } else {
        changed = false;
      }
      const invoice = await this.getInvoice(payment.invoice_id);
      if (invoice) invoice.payment_status = invoicePayments.filter((item) => item.invoice_id === invoice.id).at(-1).status;
      return changed;
    }
  };
}

function removeById(records, id) {
  const index = records.findIndex((item) => item.id === Number(id));
  if (index === -1) return false;
  records.splice(index, 1);
  return true;
}

function sortClientsByRecentActivity(clients, invoices) {
  const latestInvoiceByClientId = new Map();
  for (const invoice of invoices) {
    const clientId = Number(invoice.client_id);
    if (!clientId || !invoice.created_at) continue;
    const current = latestInvoiceByClientId.get(clientId);
    if (!current || String(invoice.created_at) > current) {
      latestInvoiceByClientId.set(clientId, String(invoice.created_at));
    }
  }

  return [...clients].sort((left, right) => {
    const leftActivity = [left.created_at, latestInvoiceByClientId.get(Number(left.id))]
      .filter(Boolean)
      .sort()
      .at(-1) || '';
    const rightActivity = [right.created_at, latestInvoiceByClientId.get(Number(right.id))]
      .filter(Boolean)
      .sort()
      .at(-1) || '';
    return rightActivity.localeCompare(leftActivity) || Number(right.id) - Number(left.id);
  });
}
