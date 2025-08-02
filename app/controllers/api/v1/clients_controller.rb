class Api::V1::ClientsController < Api::ApiController
  before_action :set_client, only: [:show]

  def index
		@clients = Client.all
		if params[:sortBy] == 'recentActivityDate'
			@clients = @clients.sort { |a,b| a.mostRecentActivityDate <=> b.mostRecentActivityDate }.reverse
		end
		if params[:filter] == 'active'
			@clients.select! { |c| not c.archived }
		elsif params[:filter] == 'archived'
			@clients.select! { |c| c.archived }
		end
		respond_with @clients, methods: :mostRecentActivityDate
  end

	def show
    render json: @client
  end

end
