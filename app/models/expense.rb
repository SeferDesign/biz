class Expense < ApplicationRecord
  belongs_to :vendor
  validates_presence_of :vendor_id, :name, :cost, :date

  default_scope { order('date ASC, name ASC') }

  scope :expenseByYear, -> (year) { past.where("SELECT extract(YEAR FROM date) = ?", year) }
  scope :expenseByMonth, -> (year, monthNumber) { past.where("SELECT extract(YEAR FROM date) = ? AND extract(MONTH FROM date) = ?", year, monthNumber) }

  scope :recent, -> { where("date >= ? AND date <= ?", 1.year.ago, Time.now) }
  scope :future, -> { where(['date > ?', Time.now]) }
	scope :past, -> { where(['date <= ?', Time.now]) }
end
