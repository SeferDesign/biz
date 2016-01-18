class Year < ActiveRecord::Base
	extend FriendlyId
	friendly_id :year

	def discounts
		discountLinesTotal = 0
		Invoice.paidByYear(self.year).each do |invoice|
			invoice.lines.each do |line|
				if line.discount?
					discountLinesTotal += line.total
				end
			end
		end
		discountLinesTotal
	end

end
