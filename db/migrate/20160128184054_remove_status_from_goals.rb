class RemoveStatusFromGoals < ActiveRecord::Migration
  def change
    remove_column :goals, :status
  end
end
