class Expense < ApplicationRecord
  belongs_to :vendor
  validates_presence_of :vendor_id, :name, :cost, :date

  default_scope { order('date ASC') }
end
