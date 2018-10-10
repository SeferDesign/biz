class User < ActiveRecord::Base
  devise :two_factor_authenticatable, :otp_secret_encryption_key => ENV['otp_secret_encryption_key']

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
end
