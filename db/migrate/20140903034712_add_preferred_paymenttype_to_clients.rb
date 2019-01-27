class AddPreferredPaymenttypeToClients < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :preferred_paymenttype, :string
  end
end
