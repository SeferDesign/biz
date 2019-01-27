class CreateYears < ActiveRecord::Migration[5.1]
  def change
    create_table :years do |t|
      t.integer :year
      t.float :taxrate

      t.timestamps
    end
  end
end
