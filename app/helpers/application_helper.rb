module ApplicationHelper

	def company
		{
			:full_name => 'Sefer Design Company LLC',
			:abbrv_name => 'Sefer Design Co.',
			:pay_to => 'Sefer Design Company LLC',
			:operator_name => 'Robert Sefer',
			:site_url => 'https://seferdesign.com',
			:email => 'info@seferdesign.com',
			:phone => '(630) 204-0013',
			:address => {
				:street => '10 W. Elm #808',
				:city => 'Chicago',
				:state => 'Illinois',
				:state_abbrv => 'IL',
				:zipcode => '60610'
			},
			:logo => {
				:default => image_url('sdc.svg'),
				:alt => image_url('sdc_white.svg'),
				:alt_png => '/images/sdc_white.png',
				:acronym => {
					:default => image_url('sdc_acronym.svg'),
					:alt => image_url('sdc_acronym_white.svg')
				},
				:favicon => image_url('sdc_favicon_144.png')
			}
		}
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

	def icon_action_edit
		icon('fas', 'edit', class: 'fa-fw fa-2x text-warning')
	end

	def icon_action_delete
		icon('fas', 'trash-alt', class: 'fa-fw fa-2x text-danger')
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
