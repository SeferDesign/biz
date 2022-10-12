class RemoveActiveFromClients < ActiveRecord::Migration[5.1]
  def change
    remove_column :clients, :active, :boolean
  end
end
