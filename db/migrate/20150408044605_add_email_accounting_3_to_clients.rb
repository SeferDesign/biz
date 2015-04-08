class AddEmailAccounting3ToClients < ActiveRecord::Migration
  def change
    add_column :clients, :email_accounting_3, :string
  end
end
