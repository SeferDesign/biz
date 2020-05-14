class AddGoogleTokenToUsers < ActiveRecord::Migration[5.1]
  def change
    add_column :users, :google_token, :string
  end
end
