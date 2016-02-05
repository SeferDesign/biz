class Project < ActiveRecord::Base
	belongs_to :client
	has_many :invoices, :dependent => :destroy

	default_scope { order('name ASC') }

	scope :complete, -> { where(completed: true) }
	scope :incomplete, -> { where.not(completed: true) }
	scope :recent, -> { where("SELECT enddate >= ?", Date.today - 182)}

	def project_client_and_name
		self.client.name + " - " + self.name
	end

	def invoiceTotal
		self.invoices.sum(:cost)
	end

end
