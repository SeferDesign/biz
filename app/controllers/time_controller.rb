class TimeController < ApplicationController
	before_action :set_google_client, only: [:index, :redirect, :callback]

	require 'google/apis/drive_v3'

	def index

		begin
			retries ||= 0
			@googleClient.update!(session[:authorization])
			service = Google::Apis::DriveV3::DriveService.new
			service.authorization = @googleClient
			sio = StringIO.new
			gFile = service.get_file(
				Figaro.env.google_drive_hours_file_id,
				download_dest: sio
			)
		rescue Signet::AuthorizationError => e
			redirect_to time_redirect_url
		rescue Google::Apis::AuthorizationError => e
			begin
				response = @googleClient.refresh!
			rescue
				redirect_to time_redirect_url
			end
			session[:authorization] = session[:authorization].merge(response)
			if (retries += 1) < 3
				retry
			else
				redirect_to time_redirect_url
			end
		end

		fileString = sio.string.gsub("\r\n", "\n")
		@rows = []
		@tClients = {}
		CSV.parse(fileString, headers: true, skip_blanks: true, row_sep: "\n") do |row|
			@rows.push(row)
			if !@tClients.key?(row['client id'])
				@tClients[row['client id']] = []
			end
			@tClients[row['client id']].push({ minutes: row['minutes'], timestamp: row['timestamp'], date: row['date'] })
		end

	end

	def redirect
		redirect_to @googleClient.authorization_uri.to_s
	end

	def callback
		@googleClient.code = params[:code]
		response = @googleClient.fetch_access_token!
		session[:authorization] = response
		current_user.update!(google_token: response)
		redirect_to time_url
	end

	private
		def set_google_client
			@googleClient = Signet::OAuth2::Client.new(client_options)
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
