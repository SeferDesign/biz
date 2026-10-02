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
    state: 'Illinios',
    zipcode: '60126'
  },
	personMain: {
		first_name: 'Robert',
		last_name: 'Sefer',
		email: 'rob@seferdesign.com'
	},
  logo: {
		pathPublic: '/images/sdc_white.svg'
	}
};

export const companyEmailFrom = `${companyInfo.name} <${companyInfo.emailContact}>`;
