class Client < ActiveRecord::Base

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

end
