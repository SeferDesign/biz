class CreateProjects < ActiveRecord::Migration[5.1]
  def change
    create_table :projects do |t|
      t.string :name
      t.integer :clientid
      t.date :startdate
      t.date :endate
      t.boolean :completed

      t.timestamps
    end
  end
end
