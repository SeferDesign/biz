# rake db:reset

user = User.create!(
  :email => 'rob@example.com',
  :password => 'admin123',
  :password_confirmation => 'admin123'
)

# last year
Year.create!(
  :year => Time.new.year - 1,
  :taxrate => 0.4
)

# next year
Year.create!(
  :year => Time.new.year + 1,
  :taxrate => 0.4
)

# this year
year = Year.create!(
  :year => Time.new.year,
  :taxrate => 0.4
)

goalYear = Goal.create!(
  :startdate => Date.today.beginning_of_year,
  :enddate => Date.today.end_of_year,
  :timeperiod => 'Year',
  :goaltype => 'Total',
  :amount => 999999.99
)

goalMonth = Goal.create!(
  :startdate => Date.today.beginning_of_month,
  :enddate => Date.today.end_of_month,
  :timeperiod => 'Month',
  :goaltype => 'Total',
  :amount => 99999.99
)

client = Client.create!(
  :name => 'Sefer Design Company LLC',
  :contact => 'Robert Sefer',
  :site_url => 'https://seferdesign.com',
  :address1 => '1 E Scott',
  :address2 => 'Suite 1402',
  :zipcode => '60610',
  :city => 'Chicago',
  :state => 'IL',
  :email_accounting => 'rsefer@gmail.com',
  :preferred_paymenttype => 'Chase Quick Pay',
  :currentrate => 85,
  :active => true,
  :federalein => '81-0123456'
)

project = Project.create!(
  :name => 'Web Site Revamp',
  :client_id => client.id,
  :startdate => 1.month.ago,
  :completed => false
)

vendor = Vendor.create!(
  :name => 'Amazon Web Services',
  :category => 'Web Service'
)

0.upto(5).each do |i|
  x = 6 - i
  invoicePaid = Invoice.create!(
    :client_id => client.id,
    :project_id => project.id,
    :date => x.month.ago,
    :worktype => 'Contract',
    :cost => (i + 1) * 10000.00,
    :paid => true,
    :paiddate => (x - 1).month.ago,
    :paymenttype => 'Chase Quick Pay',
    :description => 'This invoice represents work on various projects.'
  )

  invoicePaidLine = Line.create!(
    :description => '50% Deposit',
    :total => (i + 1) * 10000.00,
    :invoice_id => invoicePaid.id
  )

  expense = Expense.create!(
    :name => 'AWS Monthly Usage',
    :vendor_id => vendor.id,
    :date => (x - 1).month.ago,
    :cost => (i + 1) * 1234.56,
    :notes => 'Expense note example.',
    :account => 'Business'
  )
end

invoiceUnpaid = Invoice.create!(
  :client_id => client.id,
  :project_id => project.id,
  :date => 1.day.ago,
  :worktype => 'Hourly',
  :cost => 10000.00,
  :paid => false,
  :description => 'This invoice represents work on various projects.'
)

invoiceUnpaidLine = Line.create!(
  :description => 'Hourly Work',
  :hours => 10,
  :rate => 100.00,
  :total => 10000.00,
  :invoice_id => invoiceUnpaid.id
)
