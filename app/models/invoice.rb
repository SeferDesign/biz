class Invoice < ActiveRecord::Base
	has_many :lines, :dependent => :destroy

	scope :paid, -> { where(paid: true) }
	scope :unpaid, -> { where.not(paid: true) }
	scope :recent, -> { where("SELECT extract(MONTH FROM paiddate) = ?", Date.today.month) }

end
