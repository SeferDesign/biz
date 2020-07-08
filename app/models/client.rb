class Client < ActiveRecord::Base

	after_save :stripe_customer_create_update

	has_many :invoices

	has_attached_file :logo,
		:s3_protocol => :https,
    :s3_credentials => {
      :bucket => Figaro.env.aws_s3_bucket,
      :access_key_id => Figaro.env.aws_access_key_id,
      :secret_access_key => Figaro.env.aws_secret_access_key,
      :s3_region => Figaro.env.aws_region
    },
		style: {
			:medium => '300x300>',
			:thumb => '100x100>'
		},
    :path => '/images/:id/:style.:extension',
		:validate_media_type => false

	validates_attachment_content_type :logo, :content_type => %w(image/jpeg image/jpg image/png image/svg+xml)

	default_scope { order('name ASC') }

	scope :active, -> { where(active: true) }
	scope :inactive, -> { where(active: false) }

	def mostRecentActivityDate
		if self.invoices.length > 0
			self.invoices.first.created_at
		else
			self.created_at
		end
	end

	def invoiceTotal
		self.invoices.sum(:cost)
	end

	def unpaidTotal
		self.invoices.unpaid.sum(:cost)
	end

	def yearPaidInvoices(year)
		self.invoices.paidByYear(year)
	end

	def stripe_customer_create_update
		customerInfo = {
			:name => self.name,
			:email => self.email_accounting,
			:metadata => {
				'seferbiz_client_id' => self.id
			}
		}
		if self.address1.present?
			customerInfo[:address] = {
				:line1 => self.address1,
				:line2 => self.address2,
				:city => self.city,
				:state => self.state,
				:postal_code => self.zipcode
			}
		end
		if self.stripe_customer_id.blank?
			Stripe.api_key = Figaro.env.stripe_api_secret_key
			response = Stripe::Customer.create(customerInfo)
			self.stripe_customer_id = response['id']
			self.save
		end
		unless self.stripe_customer_id.blank?
			Stripe::Customer.update(
				self.stripe_customer_id,
				customerInfo
			)
		end
	end

end
