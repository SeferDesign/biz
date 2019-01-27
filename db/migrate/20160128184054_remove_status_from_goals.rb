class RemoveStatusFromGoals < ActiveRecord::Migration[5.1]
  def change
    remove_column :goals, :status
  end
end
