class AddIndexToClients < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :access_token, :string
    add_index :clients, :access_token
  end
end
