class AddCurrentRateToClients < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :currentrate, :integer
  end
end
