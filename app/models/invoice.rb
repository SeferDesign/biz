class Invoice < ActiveRecord::Base
	has_many :lines, dependent: :destroy
end
