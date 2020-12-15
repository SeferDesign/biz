class WelcomeController < ApplicationController

	def index
	end

	def best
		@months = []
		@quarters = []
		Year.all.each do |year|
			(1..12).each do |m|
				@months.append({
					year: year,
					month: m,
					income: Invoice.paidByMonth(year.year, m).sum('cost').to_i
				})
			end
			(1..4).each do |q|
				@quarters.append({
					year: year,
					quarter: q,
					income: year.incomeByQuarter(q).to_i
				})
			end
		end
		@months.sort! { |a,b| b[:income] <=> a[:income] }
		@quarters.sort! { |a,b| b[:income] <=> a[:income] }
  end

  def payment
  end

	def stripe
		@payouts = []
		Stripe::Payout.list({ limit: 100 }).auto_paging_each do |payout|
			@payouts.append(payout)
		end
		@charges = []
		Stripe::Charge.list({ limit: 100 }).auto_paging_each do |charge|
			@charges.append(charge)
		end
	end

end
