class AddInternationalInfoToClient < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :intinfo, :string
  end
end
