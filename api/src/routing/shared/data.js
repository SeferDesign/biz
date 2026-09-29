export const invoices = [
  { id: 1, client_id: 1, status: 'draft', total: 1200.0, currency: 'USD', date: '2025-01-10' },
  { id: 2, client_id: 2, status: 'sent', total: 980.5, currency: 'USD', date: '2025-02-05' },
  { id: 3, client_id: 1, status: 'paid', total: 2150.0, currency: 'USD', date: '2025-03-01', paiddate: '2025-03-15' }
];

export const clients = [
  { id: 1, name: 'Acme Inc.', email: 'billing@acme.com' },
  { id: 2, name: 'Northwind', email: 'finance@northwind.example' }
];

export const invoiceLines = {
  1: [
    { id: 1, invoice_id: 1, description: 'Design retainer', amount: 600 },
    { id: 2, invoice_id: 1, description: 'Development sprint', amount: 600 }
  ],
  2: [
    { id: 3, invoice_id: 2, description: 'Consulting hours', amount: 980.5 }
  ]
};

export const vendors = [
  { id: 1, name: 'Adobe', category: 'Software', notes: '' },
  { id: 2, name: 'Office Depot', category: 'Supplies', notes: '' }
];

export const expenses = [
  { id: 1, name: 'Creative Cloud', vendor_id: 1, date: '2025-01-15', cost: 59.99, account: 'Business', notes: '' },
  { id: 2, name: 'Printer paper', vendor_id: 2, date: '2025-02-10', cost: 42.5, account: 'Business', notes: '' }
];

export const years = [
  { id: 1, year: 2025, taxrate: 0.25, goal_year: 24000, goals_months: Array(12).fill(2000) },
  { id: 2, year: 2024, taxrate: 0.25, goal_year: 24000, goals_months: Array(12).fill(2000) }
];

export const expenseCategories = [
  'Software', 'Transporation', 'Web Service', 'Supplies', 'Business Service',
  'Travel', 'Contractor', 'Meals and Entertainment', 'Education', 'Charity', 'Other'
];
