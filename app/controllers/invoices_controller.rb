class InvoicesController < ApplicationController
  before_action :set_invoice, only: [:show, :edit, :email, :stripe, :generate_crypto_link, :mark_paid, :update, :destroy]

  def index
    @notableInvoices = Invoice.all.unpaid + Invoice.all.recent
	end

	def time

		require 'googleauth'
		credentials = Google::Auth::UserRefreshCredentials.new(
			client_id: Figaro.env.google_client_id,
			client_secret: Figaro.env.google_client_secret,
			scope: [
				'https://www.googleapis.com/auth/drive'
			],
			redirect_uri: logged_time_url,
			additional_parameters: { 'access_type' => 'offline' }
		)

		if current_user.google_token.present?
			credentials.refresh_token = current_user.google_token
			begin
				credentials.fetch_access_token!
				@session = GoogleDrive::Session.from_credentials(credentials)
			rescue
				#
			end
		end

		if !@session and params[:code].present?
			credentials.code = params[:code]
			credentials.fetch_access_token!
			@session = GoogleDrive::Session.from_credentials(credentials)
			User.find(current_user.id).update({ google_token: credentials.refresh_token })
		end

		if @session
			gFile = @session.file_by_id(Figaro.env.google_drive_hours_file_id)
			fileString = gFile.download_to_string()
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
		else
			redirect_to credentials.authorization_uri.to_s
		end

	end

  def show
    if @invoice.client.currentrate
      @ratePlaceholder = "Rate ($#{@invoice.client.currentrate})"
    else
      @ratePlaceholder = 'Rate'
    end
  	respond_to do |format|
      format.html
      format.pdf do
        render 	:pdf => Client.find(@invoice.client_id).name.gsub(/[^0-9A-Za-z]/, '') + @invoice.date.to_s,
                #:show_as_html => 'true', # Preview
        				:disposition => 'inline',
        				:page_size => 'Letter',
        				:layout => 'layouts/pdf/invoice.html',
        				:template => 'invoices/show.pdf.erb',
        				:disable_internal_links => true,
        				:disable_external_links => true,
        				:greyscale => false,
        				:lowquality => false

      end
    end
  end

  def new
    @invoice = Invoice.new
		@copied_invoice = false
		if params[:copied_id].present? and !Invoice.where(id: params[:copied_id]).empty?
			@copied_invoice = Invoice.find(params[:copied_id])
		end
  end

  def edit
  end

  def email
    InvoiceMailer.invoice_email(@invoice).deliver
    conn = Faraday.new(:url => 'https://hooks.slack.com') do |faraday|
      faraday.request  :url_encoded
      faraday.response :logger
      faraday.adapter  Faraday.default_adapter
    end
    response = conn.post '/services/' + Figaro.env.slack_accounting_webhook_id, { :payload => '{
      "attachments":[{
        "pretext":"Invoice sent.",
        "fallback":"Invoice for $' + sprintf("%.2f", @invoice.cost) + ' sent to ' + @invoice.client.contact + ' at ' + @invoice.client.name + '.",
        "fields":[
          {
            "title":"Company",
            "value":"<http://' + request.host + '/clients/' + @invoice.client.id.to_s + '|' + @invoice.client.name + '>",
            "short": true
          },
          {
            "title":"Amount",
            "value":"$' + sprintf("%.2f", @invoice.cost) + '",
            "short": true
          },
          {
            "title":"Recipient",
            "value": "<mailto:' + @invoice.client.email_accounting + '|' + @invoice.client.contact + '>",
            "short":true
          },
          {
            "title":"URL",
            "value":"<http://' + request.host + '/invoices/' + @invoice.id.to_s + '|/invoices/' + @invoice.id.to_s + '>",
            "short":true
          }
        ]
      }]
    }'}
  end

  def generate_crypto_link
    response = HTTParty.post('https://api.commerce.coinbase.com/charges', {
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': Figaro.env.coinbase_commerce_key,
        'X-CC-Version': '2018-03-22'
      },
      body: {
        name: 'SDC Invoice',
        description: @invoice.description,
        local_price: {
          amount: @invoice.cost,
          currency: 'USD'
        },
        pricing_type: 'fixed_price',
        metadata: {
          invoice_id: @invoice.id,
          invoice_url: invoice_url(@invoice),
          client_id: @invoice.client.id,
          client_name: @invoice.client.name
        }
      }.to_json
    })
    render json: {
      code: response.code,
      body: JSON.parse(response.body)
    }
  end

  def stripe
    Stripe.api_key = Figaro.env.stripe_api_secret_key
    token = params[:stripeToken]

    @stripeError = false
    begin
      charge = Stripe::Charge.create(
        :amount => (@invoice.stripeChargeCost * 100).to_i,
        :currency => 'usd',
        :source => token,
        :description => "#{@invoice.display_id}",
        :receipt_email => params[:stripeEmail],
        :metadata => { "invoice_id" => @invoice.id }
      )
      @charge = charge
      @invoice.update(:paid => true, :paymenttype => 'Stripe', :paiddate => Date.today)
    rescue Stripe::CardError => e
      @stripeError = true
    end
  end

  def populate
    @client = Client.find(params[:client_id])
    respond_to do |format|
      format.js
    end
  end

  def mark_paid
    @invoice.paiddate = Date.today
    @invoice.paid = true
    @invoice.save
    move_drive_doc_to_paid
  end

  def create
    @invoice = Invoice.new(invoice_params)

    respond_to do |format|
      if @invoice.save
        format.html { redirect_to @invoice }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
    if @invoice.paid != invoice_params[:paid] and invoice_params[:paid] == 'true'
      move_drive_doc_to_paid
    end
    respond_to do |format|
      if @invoice.update(invoice_params)
        format.html { redirect_to @invoice }
      else
        format.html { render action: 'edit' }
      end
    end
  end

  def destroy
    @invoice.destroy
    respond_to do |format|
      format.html { redirect_to invoices_url }
    end
  end

  private
    def set_invoice
      @invoice = Invoice.find(params[:id])
    end

    def invoice_params
      params.require(:invoice).permit(:client_id, :date, :worktype, :cost, :paid, :paiddate, :paymenttype, :description, :access_token)
    end
end
