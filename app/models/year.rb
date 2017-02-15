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

	def taxOwedByQuarter(quarterNumber)
		self.incomeByQuarter(quarterNumber) * self.taxrate
	end

	def paidClients
    Invoice.paidByYear(self.year).map { |i| i.client }.uniq.sort { |a,b| b.yearPaidInvoices(self.year).sum(:cost) <=> a.yearPaidInvoices(self.year).sum(:cost) }
	end

end
