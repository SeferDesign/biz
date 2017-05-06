class Vendor < ApplicationRecord
  validates_presence_of :name, :category
  has_many :expenses, :dependent => :destroy

  default_scope { order('name ASC') }
end
