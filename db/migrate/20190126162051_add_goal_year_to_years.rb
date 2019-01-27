class AddGoalYearToYears < ActiveRecord::Migration[5.1][5.1]
  def change
    add_column :years, :goal_year, :decimal
  end
end
