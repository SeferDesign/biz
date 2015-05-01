class Client < ActiveRecord::Base

	has_many :projects, :dependent => :destroy
	has_many :invoices, through: :projects

	has_attached_file :logo,
		:styles => { :medium => "300x300>", :thumb => "100x100>" },
		:default_url => "/images/clients/:style/missing.png",
		:storage => :s3,
		:s3_credentials => "#{Rails.root}/config/aws.yml",
    :path => '/images/:id/:style.:extension'
	validates_attachment_content_type :logo, :content_type => %w(image/jpeg image/jpg image/png image/svg)

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
		self.invoices.paid.where("paiddate >= ? AND paiddate <= ?", Date.new(year, 1, 1), Date.new(year, 12, 31))
	end

end
