class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

	before_action :configure_permitted_parameters, if: :devise_controller?
  before_action :authenticate_user!, :unless => :invoice_access_tokenized?

	protected
		def configure_permitted_parameters
			devise_parameter_sanitizer.permit(:sign_in, keys: [:otp_attempt])
		end

  private
    def invoice_access_tokenized?
      if (controller_name == 'welcome' and action_name == 'payment') or (controller_name == 'invoices' and (action_name == 'show' or action_name == 'stripe' or action_name == 'generate_crypto_link') and Invoice.find(params[:id]).access_token.present? and Invoice.find(params[:id]).access_token == params[:access_token])
        true
      else
        false
      end
    end

end
