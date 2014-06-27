class Project < ActiveRecord::Base
	belongs_to :client
	has_many :invoices, :dependent => :destroy

	scope :complete, -> { where(completed: true) }
	scope :incomplete, -> { where.not(completed: true) }

	def project_client_and_name
		self.client.name + " - " + self.name
	end

end
