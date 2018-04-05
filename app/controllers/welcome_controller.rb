class WelcomeController < ApplicationController

  def index
  end

  def payment
  end

  def drive
    require "google_drive"
    session = GoogleDrive::Session.from_config("config/google.json")
    session.files.take(1).each do |file|
      p file.title
    end
  end

end
