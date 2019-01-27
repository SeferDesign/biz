class CreateGoals < ActiveRecord::Migration
  def change
    create_table :goals do |t|
      t.datetime :startdate
      t.datetime :enddate
      t.string :status
      t.boolean :met
      t.string :timeperiod
      t.string :type
      t.float :amount

      t.timestamps
    end
  end
end
