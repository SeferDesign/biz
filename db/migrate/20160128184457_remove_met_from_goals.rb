class RemoveMetFromGoals < ActiveRecord::Migration
  def change
    remove_column :goals, :met
  end
end
