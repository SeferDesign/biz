class Year < ActiveRecord::Base
	extend FriendlyId
	friendly_id :year

	def invoices
		Invoice.where("SELECT extract(YEAR FROM date) = ?", self.year)
	end

	def invoiceDiscountsTotal
		discountLinesTotal = 0
		self.invoices.paidByYear(self.year).each do |invoice|
			invoice.lines.each do |line|
				if line.discount?
					discountLinesTotal += line.total
				end
			end
		end
		discountLinesTotal
	end

	def incomeTotal
		Invoice.paidByYear(self.year).sum('cost')
	end

	def taxOwedTotal
		self.incomeTotal * self.taxrate
	end

	def incomeByQuarter(quarterNumber)
		Invoice.paidByQuarter(self.year, quarterNumber).sum('cost')
	end

	def taxOwedByQuarterTaxCalendar(quarterNumber)
		quarterMonthsBounds = [1, 12]
		if quarterNumber == 1
			quarterMonthsBounds = [1, 3]
		elsif quarterNumber == 2
			quarterMonthsBounds = [4, 5]
		elsif quarterNumber == 3
			quarterMonthsBounds = [6, 8]
		elsif quarterNumber == 4
			quarterMonthsBounds = [9, 12]
		end
		income = 0
		(quarterMonthsBounds[0]..quarterMonthsBounds[1]).each do |m|
			income += Invoice.paidByMonth(self.year, m).sum(:cost)
		end
		income * self.taxrate
	end

	def taxOwedByQuarterActualCalendar(quarterNumber)
		self.incomeByQuarter(quarterNumber) * self.taxrate
	end

	def paidClients
    Invoice.paidByYear(self.year).map { |i| i.client }.uniq.sort { |a,b| b.yearPaidInvoices(self.year).sum(:cost) <=> a.yearPaidInvoices(self.year).sum(:cost) }
	end

	def expenses
		Expense.where("SELECT extract(YEAR FROM date) = ?", self.year).where(['date <= ?', Time.now])
	end

	def expensesFuture
		Expense.where("SELECT extract(YEAR FROM date) = ?", self.year).where(['date > ?', Time.now])
	end

	def expensesVendors
    self.expenses.map { |i| i.vendor }.uniq.sort { |a,b| b.yearExpenses(self.year).sum(:cost) <=> a.yearExpenses(self.year).sum(:cost) }
	end

end
