class Api::V1::ClientsController < Api::ApiController
  before_action :set_client, only: [:show]

  def index
    @clients = Client.all
    respond_with @clients
  end

  def show
    render json: @client
  end

end
