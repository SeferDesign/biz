class Project < ActiveRecord::Base
	has_many :invoices
	
	def project_client_and_name
		Client.find(self.clientid).name + " - " + self.name
	end
	
end
