class AddInvoiceStripebankSessionId < ActiveRecord::Migration[5.1]
  def change
		add_column :invoices, :stripe_bank_session_id, :string
  end
end
