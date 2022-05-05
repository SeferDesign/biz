class WelcomeController < ApplicationController
	skip_before_action :verify_authenticity_token, only: [:webhook]

	def index
	end

	def webhook
		# to test locally, run stripe listen --forward-to localhost:8000/webhook
		# and stripe trigger payment_intent.succeeded
		endpoint_secret = Figaro.env.stripe_webhook_signing_secret
		payload = request.body.read
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    event = nil
		begin
			event = Stripe::Webhook.construct_event(payload, sig_header, endpoint_secret)
		rescue JSON::ParserError => e
			puts 'parseerr'
			puts e
			render status: 400, json: {}
			return
		rescue Stripe::SignatureVerificationError => e
			puts 'sigvererr'
			puts e
			render status: 400, json: {}
			return
		end

		case event.type
    when 'payment_intent.succeeded'
			payment_intent = event.data.object
			puts payment_intent
		else
			puts "Unhandled event"
		end

		render status: 200, json: {}
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
