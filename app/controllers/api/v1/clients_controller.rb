class Api::V1::ClientsController < Api::ApiController
  before_action :set_client, only: [:show]

  def index
		@clients = Client.all
		if params[:sortBy] == 'recentActivityDate'
			@clients = @clients.sort { |a,b| a.mostRecentActivityDate <=> b.mostRecentActivityDate }.reverse
		end
		@clients.select! { |c| c.archived? == false } if params[:archived] != 'true'
		respond_with @clients, methods: :mostRecentActivityDate
  end

	def show
    render json: @client
  end

end
