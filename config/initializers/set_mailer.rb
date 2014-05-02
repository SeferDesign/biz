ActionMailer::Base.delivery_method = :smtp
ActionMailer::Base.smtp_settings = {
  :address              => 'mail.seferdesign.com',
  :port                 => 587,
  :domain               => 'seferdesign.com',
  :user_name            => 'info@seferdesign.com',
  :password             => Rails.application.secrets.email_password,
  :authentication       => 'plain',
  :enable_starttls_auto => false,
  :openssl_verify_mode  => 'none'
}
