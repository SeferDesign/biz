class AddEmailAccounting3ToClients < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :email_accounting_3, :string
  end
end
