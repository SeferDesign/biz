class Year < ActiveRecord::Base
	extend FriendlyId
	friendly_id :year

	def invoices
		Invoice.where("SELECT extract(YEAR FROM date) = ?", self.year)
	end

	def invoiceDiscountsTotal
		discountLinesTotal = 0
		self.invoices.paid.each do |invoice|
			invoice.lines.each do |line|
				if line.discount?
					discountLinesTotal += line.total
				end
			end
		end
		discountLinesTotal
	end

	def incomeTotal
		self.invoices.paid.sum('cost')
	end

	def taxOwedTotal
		self.incomeTotal * self.taxrate
	end

	def incomeByQuarter(quarterNumber)
		case quarterNumber
			when 1
				Invoice.paidByQ1(self.year).sum('cost')
			when 2
				Invoice.paidByQ2(self.year).sum('cost')
			when 3
				Invoice.paidByQ3(self.year).sum('cost')
			when 4
				Invoice.paidByQ4(self.year).sum('cost')
			else
				0
		end
	end

	def taxOwedByQuarter(quarterNumber)
		self.incomeByQuarter(quarterNumber) * self.taxrate
	end

	def paidClients
    self.invoices.paid.map { |i| i.client }.uniq.sort { |a,b| b.yearPaidInvoices(self.year).sum(:cost) <=> a.yearPaidInvoices(self.year).sum(:cost) }
	end

end
