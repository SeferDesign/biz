class AddEmailAcccounting2ToClients < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :email_accounting_2, :string
  end
end
