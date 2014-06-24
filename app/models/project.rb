class Project < ActiveRecord::Base
	has_many :invoices, dependent: :destroy

	def project_client_and_name
		Client.find(self.client_id).name + " - " + self.name
	end

end
