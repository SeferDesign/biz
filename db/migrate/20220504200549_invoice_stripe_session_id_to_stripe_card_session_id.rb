class InvoiceStripeSessionIdToStripeCardSessionId < ActiveRecord::Migration[5.1]
  def self.up
		rename_column :invoices, :stripe_session_id, :stripe_card_session_id
	 end

	 def self.down
		rename_column :invoices, :stripe_card_session_id, :stripe_session_id
	 end
end
