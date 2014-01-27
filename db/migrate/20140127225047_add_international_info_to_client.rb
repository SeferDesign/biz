class AddInternationalInfoToClient < ActiveRecord::Migration
  def change
    add_column :clients, :intinfo, :string
  end
end
