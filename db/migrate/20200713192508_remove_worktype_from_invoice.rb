class RemoveWorktypeFromInvoice < ActiveRecord::Migration[5.1]
  def change
    remove_column :invoices, :worktype, :string
  end
end
