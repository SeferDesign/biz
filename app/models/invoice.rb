class Invoice < ActiveRecord::Base
	has_many :lines, :dependent => :destroy
	belongs_to :client
	belongs_to :project

	default_scope { order('paiddate DESC') }

	scope :paid, -> { where(paid: true) }
	scope :unpaid, -> { where.not(paid: true) }
	scope :recent, -> { where("SELECT extract(MONTH FROM paiddate) = ? AND extract(YEAR FROM paiddate) = ?", Date.today.month, Date.today.year) }

	scope :contract, -> { where(worktype: 'Contract') }
	scope :hourly, -> { where(worktype: 'Hourly') }
	scope :retainer, -> { where(worktype: 'Retainer') }

	scope :unpaidByYear, -> (year) { unpaid.where("date >= ? AND date <= ?", Date.new(year, 1, 1), Date.new(year, 12, 31)) }
	scope :paidByYear, -> (year) { paid.where("SELECT extract(YEAR FROM paiddate) = ?", year) }
	scope :paidByMonth, -> (year, monthNumber) { paid.where("SELECT extract(YEAR FROM paiddate) = ? AND extract(MONTH FROM paiddate) = ?", year, monthNumber) }
	scope :paidByQuarter, -> (year, quarterNumber) { paid.where("paiddate >= ? AND paiddate <= ?", Date.new(year, 3 * quarterNumber - 2, 1), Date.new(year, 3 * quarterNumber, 1).end_of_month) }

	def display_id
		id_offset = 100000 + self.id
		self.client.name.downcase.gsub(/[^0-9A-Za-z]/, '')[0..20] + '-' + id_offset.to_s
	end

	def hasDiscount
		self.lines.any? { |l| l.discount? }
	end

end
