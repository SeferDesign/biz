class AddStripeSessionIdToInvoice < ActiveRecord::Migration[5.1]
  def change
    add_column :invoices, :stripe_session_id, :string
  end
end
