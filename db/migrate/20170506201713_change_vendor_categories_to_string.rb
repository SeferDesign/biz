class ChangeVendorCategoriesToString < ActiveRecord::Migration[5.0]
  def change
    change_column :vendors, :category, :string
  end
end
