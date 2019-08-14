class DropProjects < ActiveRecord::Migration[5.1]
	def change
		drop_table :projects
		remove_column :invoices, :project_id
  end
end
