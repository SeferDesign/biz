class AddEmailAcccountingToClients < ActiveRecord::Migration
  def change
    add_column :clients, :email_accounting, :string
  end
end
