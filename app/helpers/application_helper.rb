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
		company_logo_url = '/images/sdc_block_light.png'
	end
	def company_text_logo_url
		company_text_logo_url = '/images/sdc_text.png'
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
	
end
