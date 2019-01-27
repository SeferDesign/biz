class Changefloatstodecimals < ActiveRecord::Migration[5.1]
  def self.up
    change_table :goals do |t|
      t.change :amount, :decimal, :precision => 8, :scale => 2
    end
    change_table :invoices do |t|
      t.change :cost, :decimal, :precision => 8, :scale => 2
    end
    change_table :lines do |t|
      t.change :rate, :decimal, :precision => 8, :scale => 2
      t.change :total, :decimal, :precision => 8, :scale => 2
    end
  end
  def self.down
    change_table :goals do |t|
      t.change :amount, :float
    end
    change_table :invoices do |t|
      t.change :cost, :float
    end
    change_table :ilines do |t|
      t.change :rate, :float
      t.change :total, :float
    end
  end
end
