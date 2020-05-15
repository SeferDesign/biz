class WelcomeController < ApplicationController

  def index
  end

  def payment
  end

	def stripe
		Stripe.api_key = Figaro.env.stripe_api_secret_key
		@payouts = Stripe::Payout.list(limit: 100)
		@charges = Stripe::Charge.list(limit: 100)
	end

end
