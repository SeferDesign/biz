class Line < ActiveRecord::Base
  belongs_to :invoice
  validates :description, presence: true
  validates :total, numericality: true
end
