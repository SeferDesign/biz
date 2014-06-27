class Client < ActiveRecord::Base

	has_many :projects, :dependent => :destroy
	has_many :invoices, through: :projects

	has_attached_file :logo,
		:styles => { :medium => "300x300>", :thumb => "100x100>" },
		:default_url => "/images/clients/:style/missing.png",
		:storage => :s3,
		:s3_credentials => "#{Rails.root}/config/aws.yml",
    :path => '/images/:id/:style.:extension'
	validates_attachment_content_type :logo, :content_type => %w(image/jpeg image/jpg image/png)

	def invoiceTotal
		self.invoices.sum(:cost)
	end

	def unpaidTotal
		self.invoices.unpaid.sum(:cost)
	end

end
