class AddAccessTokenToInvoices < ActiveRecord::Migration[5.1][5.0]
  def change
    add_column :invoices, :access_token, :string
    add_index :invoices, :access_token, unique: true
  end
end
