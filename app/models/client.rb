class Client < ActiveRecord::Base
	has_many :projects
	has_attached_file :logo, :styles => { :medium => "300x300>", :thumb => "100x100>" }, :default_url => "/images/clients/:style/missing.png"
end
