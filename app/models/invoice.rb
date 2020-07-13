class Invoice < ActiveRecord::Base
	has_secure_token :access_token
	has_many :lines, :dependent => :destroy
	belongs_to :client

	default_scope { order('paiddate DESC') }

	scope :paid, -> { where(paid: true) }
	scope :unpaid, -> { where.not(paid: true) }
	scope :recent, -> { where("SELECT extract(MONTH FROM paiddate) = ? AND extract(YEAR FROM paiddate) = ?", Date.today.month, Date.today.year) }

	scope :contract, -> { where(worktype: 'Contract') }
	scope :hourly, -> { where(worktype: 'Hourly') }
	scope :notable, -> { (self.all.unpaid + self.all.recent).uniq }

	scope :unpaidByYear, -> (year) { unpaid.where("date >= ? AND date <= ?", Date.new(year, 1, 1), Date.new(year, 12, 31)) }
	scope :paidByYear, -> (year) { paid.where("SELECT extract(YEAR FROM paiddate) = ?", year) }
	scope :paidByMonth, -> (year, monthNumber) { paid.where("SELECT extract(YEAR FROM paiddate) = ? AND extract(MONTH FROM paiddate) = ?", year, monthNumber) }
	scope :paidByQuarter, -> (year, quarterNumber) { paid.where("paiddate >= ? AND paiddate <= ?", Date.new(year, 3 * quarterNumber - 2, 1), Date.new(year, 3 * quarterNumber, 1).end_of_month) }

	def unpaid
		!self.paid
	end

	def display_id_number
		(100000 + self.id).to_s
	end

	def display_id
		self.client.name.downcase.gsub(/[^0-9A-Za-z]/, '')[0..20] + '-' + self.display_id_number
	end

	def hasDiscount
		self.lines.any? { |l| l.discount? }
	end

	def stripeChargeCost
		(((self.cost or 0) + 0.30) / (1 - 0.029)).round(2)
	end

  def stripeChargeDifference
		self.stripeChargeCost - self.cost
	end

	def pdfFileName
		self.client.name.gsub(/[^0-9A-Za-z]/, '') + '-' + self.display_id_number + '-' + self.date.to_s
	end

end
