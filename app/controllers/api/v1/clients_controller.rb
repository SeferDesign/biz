class Api::V1::ClientsController < Api::ApiController
  before_action :set_client, only: [:show]

  def index
		@clients = Client.all
		if params[:sortBy] == 'recentActivityDate'
			@clients = @clients.sort { |a,b| a.mostRecentActivityDate <=> b.mostRecentActivityDate }.reverse
		end
		respond_with @clients, methods: [:mostRecentActivityDate, :archived]
  end

	def show
    render json: @client
  end

end
