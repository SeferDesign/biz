class CreateExpenses < ActiveRecord::Migration[5.0]
  def change
    create_table :expenses do |t|
      t.string :name
      t.references :vendor, foreign_key: true
      t.date :date
      t.float :cost
      t.text :notes
      t.string :account

      t.timestamps
    end
  end
end
