class ChangeColumnName < ActiveRecord::Migration
  def change
  	rename_column :projects, :endate, :enddate
  end
end
