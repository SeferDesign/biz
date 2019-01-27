class AddGoalsMonthsToYears < ActiveRecord::Migration[5.1][5.1]
  def change
    add_column :years, :goals_months, :decimal, array: true, default: []
  end
end
