class Client < ActiveRecord::Base

	has_many :projects, :dependent => :destroy
	has_many :invoices, through: :projects

	has_attached_file :logo,
		:s3_protocol => :https,
    :s3_credentials => {
      :bucket => Figaro.env.aws_s3_bucket,
      :access_key_id => Figaro.env.aws_s3_key_id,
      :secret_access_key => Figaro.env.aws_s3_secret,
      :s3_region => Figaro.env.aws_region
    },
		style: {
			:medium => '300x300>',
			:thumb => '100x100>'
		},
    :path => '/images/:id/:style.:extension'

	validates_attachment_content_type :logo, :content_type => %w(image/jpeg image/jpg image/png image/svg+xml)

	default_scope { order('name ASC') }

	scope :active, -> { where(active: true) }
	scope :inactive, -> { where(active: false) }

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
