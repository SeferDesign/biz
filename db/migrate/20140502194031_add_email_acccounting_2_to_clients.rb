class AddEmailAcccounting2ToClients < ActiveRecord::Migration
  def change
    add_column :clients, :email_accounting_2, :string
  end
end
