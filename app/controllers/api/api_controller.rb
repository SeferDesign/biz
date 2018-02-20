class Api::ApiController < ActionController::Base
  respond_to :json

  before_action :require_authentication, :unless => :access_tokenized?

  private
    def require_authentication
      render json: { error: 'Unauthorized' }, status: 401
    end

    def access_tokenized?
      if params[:access_token] == Figaro.env.api_access_token
        true
      else
        false
      end
    end

    def set_client
      @client = Client.find(params[:id])
    end

end
