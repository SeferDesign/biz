class Project < ActiveRecord::Base
	
	def project_client_and_name
		Client.find(self.clientid).name + " - " + self.name
	end
	
end
