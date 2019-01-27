class FixIdColumns < ActiveRecord::Migration[5.1]
  def change
    rename_column :projects, :clientid, :client_id
    rename_column :invoices, :clientid, :client_id
    rename_column :invoices, :projectid, :project_id
  end
end
