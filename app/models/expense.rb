class Expense < ApplicationRecord
  belongs_to :vendor
  validates_presence_of :vendor_id, :name, :cost, :date

  default_scope { order('date ASC') }

  scope :recent, -> { where("date >= ? AND date <= ?", 1.year.ago, Time.now) }
  scope :future, -> { where(['date > ?', Time.now]) }
	scope :past, -> { where(['date <= ?', Time.now]) }
end
