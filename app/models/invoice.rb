class Invoice < ActiveRecord::Base
	has_many :lines, :dependent => :destroy
	belongs_to :client

	scope :paid, -> { where(paid: true) }
	scope :unpaid, -> { where.not(paid: true) }
	scope :recent, -> { where("SELECT extract(MONTH FROM paiddate) = ? AND extract(YEAR FROM paiddate) = ?", Date.today.month, Date.today.year) }

	scope :contract, -> { where(worktype: 'Contract') }
	scope :hourly, -> { where(worktype: 'Hourly') }
	scope :retainer, -> { where(worktype: 'Retainer') }

	scope :paidByYear, -> (year) { paid.where("SELECT extract(YEAR FROM paiddate) = ?", year) }
	scope :paidByMonth, -> (date) { paid.where("SELECT extract(YEAR FROM paiddate) = ? AND extract(MONTH FROM paiddate) = ?", date.year, date.month) }

end
