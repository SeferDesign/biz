export const clientFields = [
  { name: 'name', label: 'Company name', required: true },
  { name: 'contact', label: 'Contact' },
  { name: 'email_accounting', label: 'Billing email', type: 'email' },
  { name: 'site_url', label: 'Website', type: 'url' },
  { name: 'currentrate', label: 'Hourly rate', type: 'number', min: 0, step: '0.01' },
  { name: 'preferred_paymenttype', label: 'Preferred payment method' },
  { name: 'address1', label: 'Address line 1' },
  { name: 'address2', label: 'Address line 2' },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State / region' },
  { name: 'zipcode', label: 'Postal code' },
  { name: 'federalein', label: 'Federal EIN' },
  { name: 'international', label: 'International client', type: 'checkbox' },
  { name: 'intinfo', label: 'International billing information', wide: true }
];

export const vendorFields = [
  { name: 'name', label: 'Vendor name', required: true },
  { name: 'category', label: 'Category', type: 'select', options: [
    'Software', 'Transporation', 'Web Service', 'Supplies', 'Business Service',
    'Travel', 'Contractor', 'Meals and Entertainment', 'Education', 'Charity', 'Other'
  ].map((category) => ({ value: category, label: category })) },
  { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
];

export function invoiceFields(clients) {
  return [
    { name: 'client_id', label: 'Client', type: 'relation', required: true, options: clients.map((client) => ({ value: client.id, label: client.name })) },
    { name: 'date', label: 'Issue date', type: 'date', required: true },
    { name: 'cost', label: 'Amount', type: 'number', min: 0, step: '0.01', required: true },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' }
    ] },
    { name: 'paiddate', label: 'Paid date', type: 'date' },
    { name: 'paymenttype', label: 'Payment method' },
    { name: 'currency', label: 'Currency', defaultValue: 'USD' },
    { name: 'description', label: 'Description', type: 'textarea', wide: true }
  ];
}

export const yearFields = [
  { name: 'year', label: 'Calendar Year', type: 'number', min: 1900, max: 9999, step: 1, required: true },
  { name: 'taxrate', label: 'Tax Rate', type: 'number', min: 0, max: 100, step: '0.1', multiplier: 100, helpText: 'Enter a percentage.' },
  { name: 'goal_year', label: 'Annual Goal', type: 'number', min: 0, step: '0.01' },
  { name: 'goals_months', label: 'Monthly Goals', type: 'months', wide: true }
];

export const expenseAccountOptions = ['Business', 'Personal'].map((account) => ({ value: account, label: account }));

export function expenseFields(vendors) {
  return [
    { name: 'name', label: 'Expense name', required: true },
    { name: 'vendor_id', label: 'Vendor', type: 'relation', options: vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })) },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'cost', label: 'Cost', type: 'number', min: 0, step: '0.01', required: true },
    { name: 'account', label: 'Account', type: 'select', options: expenseAccountOptions },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true }
  ];
}
