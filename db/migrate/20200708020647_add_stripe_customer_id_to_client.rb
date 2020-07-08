class AddStripeCustomerIdToClient < ActiveRecord::Migration[5.1]
  def change
    add_column :clients, :stripe_customer_id, :string
  end
end
