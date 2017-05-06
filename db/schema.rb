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

ActiveRecord::Schema.define(version: 20170506202317) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "clients", force: :cascade do |t|
    t.string   "name",                  limit: 255
    t.string   "contact",               limit: 255
    t.string   "site_url",              limit: 255
    t.string   "logo",                  limit: 255
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "logo_file_name",        limit: 255
    t.string   "logo_content_type",     limit: 255
    t.integer  "logo_file_size"
    t.datetime "logo_updated_at"
    t.string   "address1",              limit: 255
    t.string   "address2",              limit: 255
    t.integer  "zipcode"
    t.string   "city",                  limit: 255
    t.string   "state",                 limit: 255
    t.boolean  "international"
    t.string   "intinfo",               limit: 255
    t.string   "email_accounting",      limit: 255
    t.string   "email_accounting_2",    limit: 255
    t.string   "preferred_paymenttype", limit: 255
    t.integer  "currentrate"
    t.boolean  "active",                            default: true
    t.string   "email_accounting_3",    limit: 255
  end

  create_table "expenses", force: :cascade do |t|
    t.string   "name"
    t.integer  "vendor_id"
    t.date     "date"
    t.float    "cost"
    t.text     "notes"
    t.string   "account"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["vendor_id"], name: "index_expenses_on_vendor_id", using: :btree
  end

  create_table "goals", force: :cascade do |t|
    t.date     "startdate"
    t.date     "enddate"
    t.string   "timeperiod", limit: 255
    t.string   "goaltype",   limit: 255
    t.decimal  "amount",                 precision: 8, scale: 2
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "invoices", force: :cascade do |t|
    t.integer  "client_id"
    t.integer  "project_id"
    t.date     "date"
    t.string   "worktype",     limit: 255
    t.decimal  "cost",                     precision: 8, scale: 2
    t.boolean  "paid"
    t.date     "paiddate"
    t.string   "paymenttype",  limit: 255
    t.text     "description"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "access_token"
    t.index ["access_token"], name: "index_invoices_on_access_token", unique: true, using: :btree
  end

  create_table "lines", force: :cascade do |t|
    t.string   "description", limit: 255
    t.boolean  "hourly"
    t.float    "hours"
    t.decimal  "rate",                    precision: 8, scale: 2
    t.decimal  "total",                   precision: 8, scale: 2
    t.integer  "invoice_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.boolean  "discount",                                        default: false
    t.index ["invoice_id"], name: "index_lines_on_invoice_id", using: :btree
  end

  create_table "projects", force: :cascade do |t|
    t.string   "name",       limit: 255
    t.integer  "client_id"
    t.date     "startdate"
    t.date     "enddate"
    t.boolean  "completed"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "users", force: :cascade do |t|
    t.string   "email",                  limit: 255, default: "", null: false
    t.string   "encrypted_password",     limit: 255, default: "", null: false
    t.string   "reset_password_token",   limit: 255
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",                      default: 0,  null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string   "current_sign_in_ip",     limit: 255
    t.string   "last_sign_in_ip",        limit: 255
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["email"], name: "index_users_on_email", unique: true, using: :btree
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree
  end

  create_table "vendors", force: :cascade do |t|
    t.string   "name"
    t.string   "category"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "years", force: :cascade do |t|
    t.integer  "year"
    t.float    "taxrate"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_foreign_key "expenses", "vendors"
end
