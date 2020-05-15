class TimeController < ApplicationController
	before_action :set_google_client, only: [:index, :redirect, :callback]

	require 'google/apis/drive_v3'

	def index
		@client.update!(session[:authorization])
		service = Google::Apis::DriveV3::DriveService.new
		service.authorization = @client

		sio = StringIO.new
		gFile = service.get_file(
			Figaro.env.google_drive_hours_file_id,
			supports_all_drives: true,
			download_dest: sio,
			fields: '*'
		)
		fileString = sio.string

		fileString = fileString.gsub("\r\n", "\n")
		@rows = []
		@tClients = {}
		CSV.parse(fileString, headers: true, skip_blanks: true, row_sep: "\n") do |row|
			@rows.push(row)
			if !@tClients.key?(row['client id'])
				@tClients[row['client id']] = []
			end
			@tClients[row['client id']].push({ minutes: row['minutes'], timestamp: row['timestamp'], date: row['date'] })
		end

		rescue Google::Apis::AuthorizationError
			response = @client.refresh!
			session[:authorization] = session[:authorization].merge(response)
			retry
	end

	def redirect
		redirect_to @client.authorization_uri.to_s
	end

	def callback
		@client.code = params[:code]
		response = @client.fetch_access_token!
		session[:authorization] = response
		redirect_to time_url
  end

	private
		def set_google_client
			@client = Signet::OAuth2::Client.new(client_options)
		end

		def client_options
			{
				client_id: Figaro.env.google_client_id,
				client_secret: Figaro.env.google_client_secret,
				authorization_uri: 'https://accounts.google.com/o/oauth2/auth',
				token_credential_uri: 'https://accounts.google.com/o/oauth2/token',
				scope: Google::Apis::DriveV3::AUTH_DRIVE,
				redirect_uri: time_callback_url
			}
		end

end
