class AddDiscountToLines < ActiveRecord::Migration[5.1]
  def change
    add_column :lines, :discount, :boolean, :default => false
  end
end
