class AddDiscountToLines < ActiveRecord::Migration
  def change
    add_column :lines, :discount, :boolean, :default => false
  end
end
