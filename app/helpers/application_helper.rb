module ApplicationHelper

	def company_full_name
		'Sefer Design Company LLC'
	end
	def company_abbrv_name
		'Sefer Design Co.'
	end
	def company_initialed_name
		'SDC'
	end
	def company_site_url
		'https://seferdesign.com'
	end
	def company_logo_url
		image_url('sdc.svg')
	end
	def company_logo_alt_url
		image_url('sdc_white.svg')
	end
	def company_logo_alt_png_url
		'/images/sdc_white.png'
	end
	def company_acronym_logo_url
		image_url('sdc_acronym.svg')
	end
	def company_acronym_logo_alt_url
		image_url('sdc_acronym_white.svg')
	end
	def company_favicon_url
		image_url('sdc_favicon_144.png')
	end
	def company_pay_to
		self.company_full_name
	end
	def company_operator_name
		'Robert Sefer'
	end
	def company_phone
		'(630) 204-0013'
	end
	def company_email
		'info@seferdesign.com'
	end
	def company_email_invoice
		self.company_email
	end
	def company_street
		'1 E. Scott #1402'
	end
	def company_city
		'Chicago'
	end
	def company_state
		'Illinois'
	end
	def company_state_abbrv
		'IL'
	end
	def company_zipcode
		'60610'
	end

	def total_invoiced_unpaid
		Invoice.unpaid.sum('cost')
	end

	def invoice_description_suffix
		'Find below a cost-breakdown for the recent work completed.'
	end

	def invoice_description_suffix_pleasepay
		'Please make payment at your earliest convenience, and do not hesitate to contact me with any questions.'
	end

	def payment_types
		[
			'Check',
			'Credit Card',
			'Chase Quick Pay',
			'PayPal',
			'Stripe',
			'ACH',
			'Cryptocurrency',
			'Cash',
			'Venmo',
			'Other'
		]
	end

	def expense_account_types
		[
			'Business',
			'Personal'
		]
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

	def vendor_categories
		[
			'Software',
			'Transporation',
			'Web Service',
			'Supplies',
			'Business Service',
			'Travel',
			'Contractor',
			'Meals and Entertainment',
			'Education',
			'Charity',
			'Other'
		]
	end

	def today
		Date.today
	end

	def remote_svg_raw(url)
		require 'httparty'
		svg = Nokogiri::HTML(open(url)).at_css 'svg'
		svg['style'] = nil
		raw svg
	end

	require 'open-uri'
	def embed_remote_image(url, content_type)
	  asset = open(url, "r:UTF-8") { |f| f.read }
	  base64 = Base64.encode64(asset.to_s).gsub(/\s+/, "")
	  "data:#{content_type};base64,#{Rack::Utils.escape(base64)}"
	end

end
