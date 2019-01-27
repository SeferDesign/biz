class CreateClients < ActiveRecord::Migration[5.1]
  def change
    create_table :clients do |t|
      t.string :name
      t.string :contact
      t.string :site_url
      t.string :logo

      t.timestamps
    end
  end
end
