class AddGsheetIdToClients < ActiveRecord::Migration[5.0]
  def change
    add_column :clients, :gsheet_id, :string
  end
end
