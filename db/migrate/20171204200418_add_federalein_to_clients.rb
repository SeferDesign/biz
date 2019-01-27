class AddFederaleinToClients < ActiveRecord::Migration[5.1][5.0]
  def change
    add_column :clients, :federalein, :string
  end
end
