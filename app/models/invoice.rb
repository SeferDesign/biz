class Invoice < ActiveRecord::Base
	has_many :lines
end
