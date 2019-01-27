class AddEmailAcccountingToClients < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :email_accounting, :string
  end
end
