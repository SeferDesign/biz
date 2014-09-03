class AddPreferredPaymenttypeToClients < ActiveRecord::Migration
  def change
    add_column :clients, :preferred_paymenttype, :string
  end
end
