class Invoice < ActiveRecord::Base
	has_many :lines, :dependent => :destroy

	scope :paid, -> { where(paid: true) }
	scope :unpaid, -> { where.not(paid: true) }
	scope :recent, -> { where("SELECT extract(MONTH FROM paiddate) = ?", Date.today.month) }

	scope :contract, -> { where(worktype: 'Contract') }
	scope :hourly, -> { where(worktype: 'Hourly') }
	scope :retainer, -> { where(worktype: 'Retainer') }

	scope :paidByYear, -> (year) { paid.where("SELECT extract(YEAR FROM paiddate) = ?", year) }
	scope :paidByMonth, -> (month) { paid.where("SELECT extract(MONTH FROM paiddate) = ?", month) }
	#scope :paidByQuarter, -> (quarter) { paid.where("SELECT extract(MONTH FROM paiddate) = ?", month) }

end
