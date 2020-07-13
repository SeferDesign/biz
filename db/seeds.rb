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

client = Client.create!(
  :name => 'Sefer Design Company LLC',
  :contact => 'Robert Sefer',
  :site_url => 'https://seferdesign.com',
  :address1 => '10 W Elm',
  :address2 => 'Suite 808',
  :zipcode => '60610',
  :city => 'Chicago',
  :state => 'IL',
  :email_accounting => 'robtest@rsefer.com',
  :preferred_paymenttype => 'Chase Quick Pay',
  :currentrate => 85,
  :active => true,
  :federalein => '81-0123456'
)

vendor = Vendor.create!(
  :name => 'Amazon Web Services',
  :category => 'Web Service'
)

0.upto(12).each do |i|
  x = 13 - i
  invoicePaid = Invoice.create!(
    :client_id => client.id,
    :date => x.month.ago,
    :cost => (i % 2 + i % 3 + i % 4 + 1) * 10000.00,
    :paid => true,
    :paiddate => (x - 1).month.ago,
    :paymenttype => 'Chase Quick Pay',
    :description => 'This invoice represents various work.'
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
  :date => 1.day.ago,
  :cost => 10000.00,
  :paid => false,
  :description => 'This invoice represents various work.'
)

invoiceUnpaidLine = Line.create!(
  :description => 'Hourly Work',
  :hours => 10,
  :rate => 100.00,
  :total => 10000.00,
  :invoice_id => invoiceUnpaid.id
)
