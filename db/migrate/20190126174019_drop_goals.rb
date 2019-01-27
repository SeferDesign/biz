class DropGoals < ActiveRecord::Migration[5.1][5.1]
  def change
		drop_table :goals
  end
end
