class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  before_action :authenticate_user!, :unless => :invoice_access_tokenized?

  private
    def invoice_access_tokenized?
      if controller_name == 'invoices' and action_name == 'show' and Invoice.find(params[:id]).access_token.present? and Invoice.find(params[:id]).access_token == params[:access_token]
        true
      else
        false
      end
    end

end
