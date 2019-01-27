class RemoveMetFromGoals < ActiveRecord::Migration[5.1]
  def change
    remove_column :goals, :met
  end
end
