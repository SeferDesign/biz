import { recurringDate } from '../src/recurring/schedule.js';
import { businessDate } from '../src/date.js';

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
  const invoiceTemplates = [];
  const invoicePayments = [];
  const recurringExpenseRules = [];
  const history = [];
  const users = [];
  const userSessions = [];
  const apiKeys = [];
  const passkeys = [];
  const passkeyChallenges = new Map();
  return {
    users,
    userSessions,
    invoicePayments,
    recurringExpenseRules,
    history,
    async getClientAccess(id) {
      const client = snapshot.clients.find((item) => item.id === Number(id));
      return client ? { id: client.id, access_token: client.access_token } : undefined;
    },
    async getInvoiceAccess(id) {
      const invoice = snapshot.invoices.find((item) => item.id === Number(id));
      return invoice ? { id: invoice.id, client_id: invoice.client_id, access_token: invoice.access_token } : undefined;
    },
    async hasClient(id) {
      return snapshot.clients.some((item) => item.id === Number(id));
    },
    async hasVendor(id) {
      return snapshot.vendors.some((item) => item.id === Number(id));
    },
    async hasInvoice(id) {
      return snapshot.invoices.some((item) => item.id === Number(id));
    },
    async getClientName(id) {
      const client = snapshot.clients.find((item) => item.id === Number(id));
      return client ? { name: client.name } : undefined;
    },
    async getInvoiceLine(invoiceId, id) {
      return snapshot.lines.find((item) => item.invoice_id === Number(invoiceId) && item.id === Number(id));
    },
    async getClientInvoices(clientId) {
      return snapshot.invoices.filter((invoice) => invoice.client_id === Number(clientId) &&
        (invoice.paid || invoice.status !== 'draft'))
        .toSorted((left, right) => String(right.date || '').localeCompare(String(left.date || '')) || right.id - left.id);
    },
    async getUserByEmail(email) {
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    },
    async getPasswordResetUser(email) {
      const user = await this.getUserByEmail(email);
      return user ? { id: user.id, email: user.email } : undefined;
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
    async createUserSession(userId, tokenHash, ttlSeconds, userAgent = '') {
      const session = {
        id: Math.max(0, ...userSessions.map((item) => item.id)) + 1,
        user_id: Number(userId),
        token_hash: tokenHash,
        user_agent: String(userAgent).slice(0, 512),
        created_at: new Date().toISOString(),
        last_used_at: null,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        revoked_at: null
      };
      userSessions.push(session);
      return session.id;
    },
    async getUserSessionByTokenHash(tokenHash) {
      const session = userSessions.find((item) => item.token_hash === tokenHash &&
        !item.revoked_at && new Date(item.expires_at).getTime() > Date.now());
      const user = session && users.find((item) => item.id === session.user_id);
      if (!session || !user) return null;
      session.last_used_at = new Date().toISOString();
      return {
        session_id: session.id,
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      };
    },
    async getUserSessions(userId) {
      return userSessions
        .filter((item) => item.user_id === Number(userId) && !item.revoked_at && new Date(item.expires_at).getTime() > Date.now())
        .sort((left, right) => String(right.last_used_at || right.created_at).localeCompare(String(left.last_used_at || left.created_at)))
        .map(({ id, user_agent, created_at, last_used_at, expires_at }) => ({ id, user_agent, created_at, last_used_at, expires_at }));
    },
    async revokeUserSession(userId, sessionId) {
      const session = userSessions.find((item) => item.id === Number(sessionId) && item.user_id === Number(userId) && !item.revoked_at);
      if (!session) return false;
      session.revoked_at = new Date().toISOString();
      return true;
    },
    async revokeUserSessions(userId, exceptSessionId = null) {
      let revoked = 0;
      for (const session of userSessions) {
        if (session.user_id !== Number(userId) || session.revoked_at ||
            (exceptSessionId != null && session.id === Number(exceptSessionId))) continue;
        session.revoked_at = new Date().toISOString();
        revoked += 1;
      }
      return revoked;
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
    async updateUserPassword(id, encryptedPassword, currentSessionId = null) {
      const user = users.find((item) => item.id === Number(id));
      if (user) Object.assign(user, { encrypted_password: encryptedPassword, reset_password_token: null, reset_password_sent_at: null });
      await this.revokeUserSessions(id, currentSessionId);
    },
    async createPasswordReset(id, tokenDigest) {
      const user = users.find((item) => item.id === Number(id));
      if (user) Object.assign(user, { reset_password_token: tokenDigest, reset_password_sent_at: new Date() });
    },
    async consumePasswordReset(tokenDigest, encryptedPassword) {
      const user = users.find((item) => item.reset_password_token === tokenDigest);
      if (!user || !user.reset_password_sent_at || Date.now() - new Date(user.reset_password_sent_at).getTime() > 6 * 60 * 60 * 1000) return false;
      Object.assign(user, { encrypted_password: encryptedPassword, reset_password_token: null, reset_password_sent_at: null });
      await this.revokeUserSessions(user.id);
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
    async getPasskeysByUser(userId) {
      return passkeys.filter((passkey) => passkey.user_id === Number(userId)).map(({ id, name, created_at }) => ({ id, name, created_at }));
    },
    async getPasskeyCredentialsByUser(userId) {
      return passkeys.filter((passkey) => passkey.user_id === Number(userId));
    },
    async getPasskeyByCredentialId(credentialId) {
      return passkeys.find((passkey) => passkey.credential_id === credentialId);
    },
    async createPasskeyChallenge(challenge) {
      passkeyChallenges.set(challenge.challenge_id, {
        ...challenge,
        user_id: challenge.user_id ?? null,
        expires_at: Date.now() + 5 * 60 * 1000
      });
    },
    async consumePasskeyChallenge(challengeId, purpose, userId = null) {
      const challenge = passkeyChallenges.get(challengeId);
      if (!challenge || challenge.purpose !== purpose || challenge.user_id !== userId || challenge.expires_at <= Date.now()) return undefined;
      passkeyChallenges.delete(challengeId);
      return challenge;
    },
    async createPasskey(userId, passkey) {
      if (passkeys.some((item) => item.credential_id === passkey.credential_id)) {
        const error = new Error('Duplicate passkey');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      const created = {
        id: Math.max(0, ...passkeys.map((item) => item.id)) + 1,
        user_id: Number(userId),
        ...passkey,
        created_at: new Date().toISOString()
      };
      passkeys.push(created);
      return { id: created.id, name: created.name, created_at: created.created_at };
    },
    async updatePasskeyCounter(credentialId, counter) {
      const passkey = passkeys.find((item) => item.credential_id === credentialId);
      if (passkey) passkey.counter = counter;
    },
    async deletePasskey(userId, id) {
      const index = passkeys.findIndex((passkey) => passkey.id === Number(id) && passkey.user_id === Number(userId));
      if (index < 0) return false;
      passkeys.splice(index, 1);
      return true;
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
    async getSnapshot(selection) {
      const records = {
        ...snapshot,
        clients: sortClientsByRecentActivity(snapshot.clients, snapshot.invoices)
      };
      if (!selection) return records;
      return Object.fromEntries(Object.entries(records).map(([table, rows]) => [table,
        !selection[table] ? [] : selection[table] === true ? rows : rows.map((row) =>
          Object.fromEntries(selection[table].map((field) => [field, row[field]])))
      ]));
    },
    async recordHistory(entry) {
      const record = {
        id: Math.max(0, ...history.map((item) => item.id)) + 1,
        created_at: new Date().toISOString(),
        ...structuredClone(entry)
      };
      history.push(record);
      return record.id;
    },
    async listHistory({ entityType, entityId, pageSize, offset }) {
      const filtered = history.filter((record) =>
        (!entityType || record.entity_type === entityType) &&
        (!entityId || record.entity_id === Number(entityId))
      ).toSorted((left, right) => String(right.created_at).localeCompare(String(left.created_at)) || right.id - left.id);
      const items = filtered.slice(offset, offset + pageSize).map((record) => {
        const collection = { client: 'clients', expense: 'expenses', vendor: 'vendors', invoice: 'invoices' }[record.entity_type];
        const entity = snapshot[collection]?.find((item) => item.id === record.entity_id);
        const actor = users.find((user) => user.id === record.actor_user_id);
        return {
          ...record,
          actor_first_name: actor?.first_name ?? null,
          actor_last_name: actor?.last_name ?? null,
          entity_name: entity?.name ?? null,
          client_name: record.entity_type === 'invoice'
            ? snapshot.clients.find((client) => client.id === entity?.client_id)?.name ?? null : null,
          vendor_name: record.entity_type === 'expense'
            ? snapshot.vendors.find((vendor) => vendor.id === entity?.vendor_id)?.name ?? null : null
        };
      });
      return { items, total: filtered.length };
    },
    async getDashboardSummary() {
      const [year, month] = businessDate().split('-').map(Number);
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const trailingStart = new Date(Date.UTC(year, month - 5, 1));
      const dataStart = new Date(Date.UTC(year, 0, 1));
      if (trailingStart < dataStart) dataStart.setTime(trailingStart.getTime());
      const firstMonth = dataStart.toISOString().slice(0, 7);
      const monthlyRevenue = {};
      const monthlyExpenses = {};
      const addMonthly = (totals, key, amount) => {
        totals[key] = (totals[key] || 0) + Number(amount || 0);
      };
      for (const invoice of snapshot.invoices) {
        const date = String(invoice.paiddate || invoice.date || '').slice(0, 7);
        if ((invoice.paid === true || invoice.status === 'paid') && date >= firstMonth && date <= monthKey) {
          addMonthly(monthlyRevenue, date, invoice.cost ?? invoice.total);
        }
      }
      for (const expense of snapshot.expenses) {
        const date = String(expense.date || '').slice(0, 7);
        if (!expense.is_planned && date >= firstMonth && date <= monthKey) addMonthly(monthlyExpenses, date, expense.cost);
      }
      const yearRecords = snapshot.years.filter((record) =>
        Number(record.year) >= trailingStart.getUTCFullYear() && Number(record.year) <= year);
      const currentYearTotal = (totals) => Object.entries(totals)
        .filter(([key]) => key.startsWith(`${year}-`))
        .reduce((total, [, value]) => total + value, 0);
      const openInvoices = snapshot.invoices.filter((invoice) => invoice.paid !== true && invoice.status !== 'paid');
      const recentInvoices = [...snapshot.invoices]
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')) ||
          ({ draft: 0, sent: 1, paid: 2 }[left.status] ?? 3) - ({ draft: 0, sent: 1, paid: 2 }[right.status] ?? 3) ||
          Number(right.id) - Number(left.id))
        .slice(0, 6)
        .map((invoice) => ({
          ...invoice,
          client_name: snapshot.clients.find((client) => Number(client.id) === Number(invoice.client_id))?.name
        }));
      return {
        year,
        month: monthKey,
        openInvoices: {
          count: openInvoices.length,
          total: openInvoices.reduce((total, invoice) => total + Number(invoice.cost ?? invoice.total ?? 0), 0)
        },
        monthlyRevenue,
        monthlyExpenses,
        yearRevenue: currentYearTotal(monthlyRevenue),
        yearExpenses: currentYearTotal(monthlyExpenses),
        yearRecords,
        recentInvoices
      };
    },
    async searchRecords() {
      const clientsById = new Map(snapshot.clients.map((client) => [Number(client.id), client]));
      const vendorsById = new Map(snapshot.vendors.map((vendor) => [Number(vendor.id), vendor]));
      return {
        clients: snapshot.clients,
        vendors: snapshot.vendors,
        expenses: snapshot.expenses.map((expense) => ({
          ...expense,
          vendor_name: vendorsById.get(Number(expense.vendor_id))?.name
        })),
        invoices: snapshot.invoices.map((invoice) => ({
          ...invoice,
          client_name: clientsById.get(Number(invoice.client_id))?.name
        })),
        lines: snapshot.lines.map((line) => ({
          ...line,
          client_name: clientsById.get(Number(snapshot.invoices.find((invoice) => Number(invoice.id) === Number(line.invoice_id))?.client_id))?.name
        })),
        years: snapshot.years
      };
    },
    async listClients({ pageSize, offset }) {
      const clients = sortClientsByRecentActivity(snapshot.clients, snapshot.invoices);
      return { items: clients.slice(offset, offset + pageSize), total: clients.length };
    },
    async listInvoices({ pageSize, offset }) {
      const statusOrder = { draft: 0, sent: 1, paid: 2 };
      const invoices = [...snapshot.invoices].sort((left, right) =>
        (statusOrder[left.status] ?? 3) - (statusOrder[right.status] ?? 3) ||
        String(right.date || '').localeCompare(String(left.date || '')) || Number(right.id) - Number(left.id));
      return { items: invoices.slice(offset, offset + pageSize), total: invoices.length };
    },
    async listExpenses({ pageSize, offset, filter }) {
      const today = businessDate();
      const filtered = snapshot.expenses.filter((expense) => {
        if (filter === 'all') return true;
        if (filter === 'future') return expense.date > today;
        if (filter === 'inactive') return expense.date <= today && !expense.is_planned;
        const cutoff = new Date(`${today}T00:00:00Z`);
        cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
        return !expense.is_planned && expense.date >= cutoff.toISOString().slice(0, 10) && expense.date <= today;
      });
      filtered.sort((left, right) => (filter === 'future' ? 1 : -1) *
        (String(left.date || '').localeCompare(String(right.date || '')) || Number(left.id) - Number(right.id)));
      return {
        items: filtered.slice(offset, offset + pageSize).map((expense) => ({
          ...expense,
          vendor_name: snapshot.vendors.find((vendor) => Number(vendor.id) === Number(expense.vendor_id))?.name
        })),
        total: filtered.length
      };
    },
    async listVendors({ pageSize, offset }) {
      const sortableName = (name) => String(name || '').replace(/^(the|a|an)\s+/i, '');
      const vendors = snapshot.vendors.map((vendor) => {
        const expenses = snapshot.expenses.filter((expense) =>
          Number(expense.vendor_id) === Number(vendor.id) && !expense.is_planned &&
          expense.date <= businessDate());
        return {
          ...vendor,
          expense_count: expenses.length,
          expense_total: expenses.reduce((total, expense) => total + Number(expense.cost || 0), 0)
        };
      }).sort((left, right) => sortableName(left.name).localeCompare(sortableName(right.name)));
      return { items: vendors.slice(offset, offset + pageSize), total: vendors.length };
    },
    async getClient(id, fields = true) {
      const client = snapshot.clients.find((item) => item.id === Number(id));
      return client && fields !== true ? Object.fromEntries(fields.map((field) => [field, client[field]])) : client;
    },
    async listInvoiceTemplates(clientId) {
      return invoiceTemplates
        .filter((template) => clientId == null || template.client_id == null || template.client_id === Number(clientId))
        .sort((left, right) => Number(left.client_id != null) - Number(right.client_id != null) || left.name.localeCompare(right.name));
    },
    async getInvoiceTemplate(id) {
      return invoiceTemplates.find((item) => item.id === Number(id));
    },
    async createInvoiceTemplate(input) {
      const template = { id: Math.max(0, ...invoiceTemplates.map((item) => item.id)) + 1, ...input };
      invoiceTemplates.push(template);
      return template;
    },
    async updateInvoiceTemplate(id, input) {
      const template = await this.getInvoiceTemplate(id);
      if (template) Object.assign(template, input);
      return template;
    },
    async deleteInvoiceTemplate(id) {
      return removeById(invoiceTemplates, id);
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
    async ensureClientAccessToken(id) {
      const client = await this.getClient(id);
      if (client && !client.access_token) client.access_token = `client-token-${client.id}`;
      return client?.access_token;
    },
    async setClientStripeCustomerId(id, customerId) {
      const client = await this.getClient(id);
      if (client) client.stripe_customer_id = customerId;
    },
    async getVendor(id) {
      return snapshot.vendors.find((item) => item.id === Number(id));
    },
    async hasVendorUsage(id) {
      return snapshot.expenses.some((expense) => Number(expense.vendor_id) === Number(id)) ||
        recurringExpenseRules.some((rule) => Number(rule.vendor_id) === Number(id));
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
    async listRecurringExpenseRules() {
      return [...recurringExpenseRules].sort((left, right) => Number(right.active) - Number(left.active) ||
        String(left.next_date || '').localeCompare(String(right.next_date || '')) || left.id - right.id);
    },
    async getRecurringExpenseRule(id) {
      return recurringExpenseRules.find((item) => item.id === Number(id));
    },
    async deleteRecurringExpenseRule(id) {
      const rule = await this.getRecurringExpenseRule(id);
      if (!rule) return null;
      const plannedExpenses = snapshot.expenses.filter((expense) =>
        Number(expense.recurring_rule_id) === Number(id) && expense.is_planned);
      const actualExpenses = snapshot.expenses.filter((expense) =>
        Number(expense.recurring_rule_id) === Number(id) && !expense.is_planned);
      snapshot.expenses = snapshot.expenses.filter((expense) =>
        Number(expense.recurring_rule_id) !== Number(id) || !expense.is_planned);
      for (const expense of actualExpenses) expense.recurring_rule_id = null;
      removeById(recurringExpenseRules, id);
      return { rule, plannedExpenses, preservedExpenseIds: actualExpenses.map((expense) => Number(expense.id)) };
    },
    async createRecurringExpenseRule(input) {
      const rule = {
        id: Math.max(0, ...recurringExpenseRules.map((item) => item.id)) + 1,
        ...input,
        date: input.start_date,
        next_date: input.start_date,
        next_index: 0,
        active: true
      };
      recurringExpenseRules.push(rule);
      const expense = await this.createExpense({
        name: rule.name,
        vendor_id: rule.vendor_id ?? null,
        date: rule.next_date,
        cost: rule.cost,
        notes: rule.notes ?? null,
        account: rule.account || 'Business',
        is_planned: true,
        recurring_rule_id: rule.id
      });
      return { rule, expense };
    },
    async updateRecurringExpenseRule(id, updates) {
      const rule = await this.getRecurringExpenseRule(id);
      if (!rule) return null;
      const scheduleChanged = updates.start_date !== undefined || updates.interval_unit !== undefined || updates.interval_count !== undefined;
      Object.assign(rule, updates);
      if (scheduleChanged && updates.start_date === undefined) rule.start_date = rule.next_date || rule.start_date;
      if (scheduleChanged) {
        rule.date = rule.start_date;
        rule.next_date = rule.start_date;
        rule.next_index = 0;
      }
      if (!rule.active && updates.active === true && rule.next_date) {
        let resumeIndex = Number(rule.next_index);
        let resumeDate = rule.next_date;
        const today = businessDate();
        while (resumeDate <= today && resumeIndex < 10000) {
          resumeIndex += 1;
          resumeDate = recurringDate(rule.start_date, rule.interval_unit, Number(rule.interval_count), resumeIndex);
        }
        rule.next_index = resumeIndex;
        rule.next_date = resumeDate;
      }
      if (rule.end_date && rule.next_date > rule.end_date) {
        rule.active = false;
        rule.next_date = null;
      }
      const planned = snapshot.expenses.find((expense) =>
        Number(expense.recurring_rule_id) === Number(id) && expense.is_planned);
      if (!rule.active || !rule.next_date) {
        snapshot.expenses = snapshot.expenses.filter((expense) =>
          Number(expense.recurring_rule_id) !== Number(id) || !expense.is_planned);
      } else if (planned) {
        Object.assign(planned, {
          name: rule.name,
          vendor_id: rule.vendor_id ?? null,
          date: rule.next_date,
          cost: rule.cost,
          notes: rule.notes ?? null,
          account: rule.account || 'Business'
        });
      } else {
        await this.createExpense({
          name: rule.name,
          vendor_id: rule.vendor_id ?? null,
          date: rule.next_date,
          cost: rule.cost,
          notes: rule.notes ?? null,
          account: rule.account || 'Business',
          is_planned: true,
          recurring_rule_id: rule.id
        });
      }
      return rule;
    },
    async processDueRecurringExpenses(today = businessDate()) {
      const activatedIds = new Set();
      for (const rule of recurringExpenseRules) {
        if (!rule.active || !rule.next_date || rule.next_date > today) continue;
        let occurrenceIndex = Number(rule.next_index);
        let occurrenceDate = rule.next_date;
        let catchUpCount = 0;
        while (occurrenceDate <= today && catchUpCount < 1000) {
          const planned = snapshot.expenses.find((expense) =>
            Number(expense.recurring_rule_id) === Number(rule.id) && expense.date === occurrenceDate && expense.is_planned);
          if (planned) {
            planned.is_planned = false;
            activatedIds.add(Number(planned.id));
            await this.recordHistory({
              entity_type: 'expense', entity_id: planned.id, action: 'activated',
              actor_user_id: null, actor_email: null, source: 'scheduler',
              changes: { is_planned: { from: true, to: false } }
            });
          }
          occurrenceIndex += 1;
          const nextDate = recurringDate(rule.start_date, rule.interval_unit, Number(rule.interval_count), occurrenceIndex);
          if (rule.end_date && nextDate > rule.end_date) {
            Object.assign(rule, { active: false, next_date: null, next_index: occurrenceIndex });
            break;
          }
          Object.assign(rule, { next_date: nextDate, next_index: occurrenceIndex });
          if (!snapshot.expenses.some((expense) =>
            Number(expense.recurring_rule_id) === Number(rule.id) && expense.date === nextDate)) {
            await this.createExpense({
              name: rule.name,
              vendor_id: rule.vendor_id ?? null,
              date: nextDate,
              cost: rule.cost,
              notes: rule.notes ?? null,
              account: rule.account || 'Business',
              is_planned: true,
              recurring_rule_id: rule.id
            });
          }
          occurrenceDate = nextDate;
          catchUpCount += 1;
        }
      }
      for (const expense of snapshot.expenses) {
        if (!expense.is_planned || expense.date > today) continue;
        expense.is_planned = false;
        activatedIds.add(Number(expense.id));
        await this.recordHistory({
          entity_type: 'expense', entity_id: expense.id, action: 'activated',
          actor_user_id: null, actor_email: null, source: 'scheduler',
          changes: { is_planned: { from: true, to: false } }
        });
      }
      return activatedIds.size;
    },
    async getExpensesByIds(ids) {
      return snapshot.expenses.filter((item) => ids.includes(Number(item.id)));
    },
    async createExpense(input) {
      const expense = {
        id: Math.max(0, ...snapshot.expenses.map((item) => item.id)) + 1,
        is_planned: false,
        recurring_rule_id: null,
        ...input
      };
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
    async getInvoice(id, fields = true) {
      const invoice = snapshot.invoices.find((item) => item.id === Number(id));
      return invoice && fields !== true ? Object.fromEntries(fields.map((field) => [field, invoice[field]])) : invoice;
    },
    async getInvoiceLines(invoiceId) {
      return snapshot.lines.filter((line) => Number(line.invoice_id) === Number(invoiceId));
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
    async updateInvoice(id, updates, fields = true) {
      const invoice = snapshot.invoices.find((item) => item.id === Number(id));
      if (invoice) Object.assign(invoice, updates);
      return this.getInvoice(id, fields);
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
      const before = structuredClone(invoice);
      Object.assign(invoice, { paid: true, status: 'paid', paiddate, paymenttype });
      await this.recordHistory({
        entity_type: 'invoice',
        entity_id: invoice.id,
        action: 'payment_received',
        actor_user_id: null,
        actor_email: null,
        source: 'stripe',
        changes: {
          paid: { from: Boolean(before.paid), to: true },
          status: { from: before.status, to: 'paid' },
          paiddate: { from: before.paiddate ?? null, to: paiddate },
          paymenttype: { from: before.paymenttype ?? null, to: paymenttype }
        }
      });
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
