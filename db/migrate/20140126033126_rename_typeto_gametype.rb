class RenameTypetoGametype < ActiveRecord::Migration[5.1]
  def change
  	rename_column :goals, :type, :goaltype
  end
end
