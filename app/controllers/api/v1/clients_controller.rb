class Api::V1::ClientsController < Api::ApiController
  before_action :set_client, only: [:show]

  def index
		@clients = Client.all
		if params[:sortBy] == 'date'
			@clients = @clients.sort { |a,b| a.mostRecentInvoiceDate <=> b.mostRecentInvoiceDate }
		end
    respond_with @clients, methods: :mostRecentInvoiceDate
  end

	def show
    render json: @client
  end

end
