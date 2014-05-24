module ApplicationHelper

	def company_full_name
		company_full_name = 'Sefer Design Company'
	end
	def company_abbrv_name
		company_abbrv_name = 'Sefer Design Co.'
	end
	def company_initialed_name
		company_initialed_name = 'SDC'
	end
	def company_site_url
		company_site_url = 'http://seferdesign.com'
	end
	def company_logo_url
		company_logo_url = '/images/sdc_block_dark.svg'
	end
	def company_logo_alt_url
		company_logo_alt_url = '/images/sdc_block_white.svg'
	end
	def company_text_logo_url
		company_text_logo_url = '/images/sdc_text_dark.svg'
	end
	def company_text_logo_alt_url
		company_text_logo_alt_url = '/images/sdc_text_white.svg'
	end
	def company_favicon_url
		company_favicon_url = '/images/sdc_favicon_144.png'
	end
	def company_pay_to
		company_pay_to = 'Robert Sefer'
	end
	def company_phone
		company_phone = '(630) 204-0013'
	end
	def company_email
		company_email = 'rsefer@gmail.com'
	end
	def company_email_invoice
		company_email_invoice = 'info@seferdesign.com'
	end
	def company_street
		company_street = '1 E. Scott #2006'
	end
	def company_city
		company_city = 'Chicago'
	end
	def company_state
		company_city = 'Illinois'
	end
	def company_state_abbrv
		company_city = 'IL'
	end
	def company_zipcode
		company_city = '60610'
	end

	def total_invoiced_unpaid
		total_invoiced_unpaid = Invoice.where(:paid => false).sum('cost')
	end

	def invoice_description_suffix
		invoice_description_suffix = 'Find below a cost-breakdown for the recent work completed.'
	end

	def invoice_description_suffix_pleasepay
		invoice_description_suffix_pleasepay = 'Please make payment at your earliest convenience, and do not hesitate to contact me with any questions.'
	end

	def us_states
    [
      ['Alabama', 'AL'],
      ['Alaska', 'AK'],
      ['Arizona', 'AZ'],
      ['Arkansas', 'AR'],
      ['California', 'CA'],
      ['Colorado', 'CO'],
      ['Connecticut', 'CT'],
      ['Delaware', 'DE'],
      ['District of Columbia', 'DC'],
      ['Florida', 'FL'],
      ['Georgia', 'GA'],
      ['Hawaii', 'HI'],
      ['Idaho', 'ID'],
      ['Illinois', 'IL'],
      ['Indiana', 'IN'],
      ['Iowa', 'IA'],
      ['Kansas', 'KS'],
      ['Kentucky', 'KY'],
      ['Louisiana', 'LA'],
      ['Maine', 'ME'],
      ['Maryland', 'MD'],
      ['Massachusetts', 'MA'],
      ['Michigan', 'MI'],
      ['Minnesota', 'MN'],
      ['Mississippi', 'MS'],
      ['Missouri', 'MO'],
      ['Montana', 'MT'],
      ['Nebraska', 'NE'],
      ['Nevada', 'NV'],
      ['New Hampshire', 'NH'],
      ['New Jersey', 'NJ'],
      ['New Mexico', 'NM'],
      ['New York', 'NY'],
      ['North Carolina', 'NC'],
      ['North Dakota', 'ND'],
      ['Ohio', 'OH'],
      ['Oklahoma', 'OK'],
      ['Oregon', 'OR'],
      ['Pennsylvania', 'PA'],
      ['Puerto Rico', 'PR'],
      ['Rhode Island', 'RI'],
      ['South Carolina', 'SC'],
      ['South Dakota', 'SD'],
      ['Tennessee', 'TN'],
      ['Texas', 'TX'],
      ['Utah', 'UT'],
      ['Vermont', 'VT'],
      ['Virginia', 'VA'],
      ['Washington', 'WA'],
      ['West Virginia', 'WV'],
      ['Wisconsin', 'WI'],
      ['Wyoming', 'WY']
    ]
	end

end
