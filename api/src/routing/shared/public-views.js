// Fields exposed to clients who open a record through its access-token link.
const clientFields = [
  'id', 'name', 'contact', 'site_url', 'address1', 'address2', 'city', 'state', 'zipcode',
  'international', 'intinfo', 'email_accounting', 'email_accounting_2', 'email_accounting_3', 'payment_terms'
];
const invoiceFields = ['id', 'display_id_number', 'display_id', 'date', 'cost', 'total', 'currency', 'description', 'status', 'paid', 'paiddate', 'paymenttype', 'payment_status'];
const lineFields = ['id', 'invoice_id', 'description', 'hourly', 'hours', 'rate', 'total', 'amount', 'discount'];

const pick = (record, fields) => Object.fromEntries(fields.filter((field) => record[field] !== undefined).map((field) => [field, record[field]]));

export function publicClient(client) {
  return { ...pick(client, clientFields), email: client.email_accounting || client.email || null };
}

export function publicInvoice(invoice, client) {
  const view = pick(invoice, invoiceFields);
  if (!view.paid && view.status !== 'paid') view.status = view.payment_status === 'processing' ? 'processing' : 'due';
  return {
    ...view,
    client: client ? pick(client, ['name', 'contact', 'address1', 'address2', 'city', 'state', 'zipcode', 'intinfo', 'payment_terms']) : null
  };
}

export function publicLine(line) {
  return pick(line, lineFields);
}
