class CreateInvoices < ActiveRecord::Migration
  def change
    create_table :invoices do |t|
      t.integer :clientid
      t.integer :projectid
      t.date :date
      t.string :worktype
      t.float :cost
      t.boolean :paid
      t.date :paiddate
      t.string :paymenttype
      t.text :description

      t.timestamps
    end
  end
end
