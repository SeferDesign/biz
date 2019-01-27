class CreateLines < ActiveRecord::Migration[5.1]
  def change
    create_table :lines do |t|
      t.string :description
      t.boolean :hourly
      t.float :hours
      t.float :rate
      t.float :total
      t.references :invoice, index: true

      t.timestamps
    end
  end
end
