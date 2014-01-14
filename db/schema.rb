# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20140113215803) do

  create_table "clients", force: true do |t|
    t.string   "name"
    t.string   "contact"
    t.string   "site_url"
    t.string   "logo"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "logo_file_name"
    t.string   "logo_content_type"
    t.integer  "logo_file_size"
    t.datetime "logo_updated_at"
  end

  create_table "invoices", force: true do |t|
    t.integer  "clientid"
    t.integer  "projectid"
    t.date     "date"
    t.string   "worktype"
    t.float    "cost"
    t.boolean  "paid"
    t.date     "paiddate"
    t.string   "paymenttype"
    t.text     "description"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "projects", force: true do |t|
    t.string   "name"
    t.integer  "clientid"
    t.date     "startdate"
    t.date     "enddate"
    t.boolean  "completed"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

end
