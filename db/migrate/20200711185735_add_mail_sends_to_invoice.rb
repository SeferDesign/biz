class AddMailSendsToInvoice < ActiveRecord::Migration[5.1]
  def change
    add_column :invoices, :mail_sends, :datetime, array: true, default: []
  end
end
