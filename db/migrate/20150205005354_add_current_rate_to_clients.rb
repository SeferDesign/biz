class AddCurrentRateToClients < ActiveRecord::Migration
  def change
    add_column :clients, :currentrate, :integer
  end
end
