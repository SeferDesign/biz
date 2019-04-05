class AddNotesToVendors < ActiveRecord::Migration[5.1]
  def change
    add_column :vendors, :notes, :text
  end
end
