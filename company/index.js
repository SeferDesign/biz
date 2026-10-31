export const companyInfo = {
  legalEntity: 'Sefer Design Company LLC',
  name: 'Sefer Design Co.',
  acronym: 'SDC',
  website: 'https://seferdesign.com',
  emailContact: 'info@seferdesign.com',
  address: {
    address1: '205 S Hawthorne Ave.',
    address2: null,
    city: 'Elmhurst',
    state: 'IL',
    zipcode: '60126'
  },
  personMain: {
    first_name: 'Robert',
    last_name: 'Sefer',
    email: 'rob@seferdesign.com'
  },
  logoPath: '/images/sdc.svg',
  logo: {
    pathPublic: '/images/sdc.svg'
  }
};

export const companyEmailFrom = `${companyInfo.name} <${companyInfo.emailContact}>`;

export function formatMailingAddress({ address1, address2, city, state, zipcode } = {}) {
  const clean = (value) => (value == null ? '' : String(value).trim());
  const streetLine = [clean(address1), clean(address2)].filter(Boolean).join(' ');
  const locality = [clean(city), clean(state)].filter(Boolean).join(', ');
  const localityLine = [locality, clean(zipcode)].filter(Boolean).join(' ');
  return [streetLine, localityLine].filter(Boolean).join('\n');
}

export function displayIdNumber(id) {
  return (100000 + Number(id)).toString();
}

export function displayId(clientName, id) {
  const normalizedClient = String(clientName || '')
    .toLowerCase()
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(0, 21);
  return `${normalizedClient}-${displayIdNumber(id)}`;
}

export function withInvoiceDisplayIds(invoice, clientName) {
  if (!invoice) return invoice;
  return {
    ...invoice,
    display_id_number: displayIdNumber(invoice.id),
    display_id: displayId(clientName, invoice.id)
  };
}
