class WelcomeController < ApplicationController

  def index
  end

  def payment
  end

	def stripe
		Stripe.api_key = Figaro.env.stripe_api_secret_key
		@payouts = Stripe::Payout.list(limit: 9999)
		@charges = Stripe::Charge.list(limit: 9999)
	end

  def drive
    require "google_drive"
    session = GoogleDrive::Session.from_config("config/google.json")
    session.files.take(1).each do |file|
      p file.title
    end
  end

end
