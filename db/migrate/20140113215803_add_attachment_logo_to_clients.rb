class AddAttachmentLogoToClients < ActiveRecord::Migration[5.1]
  def self.up
    change_table :clients do |t|
      t.attachment :logo
    end
  end

  def self.down
    drop_attached_file :clients, :logo
  end
end
