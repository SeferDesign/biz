class InvoicesController < ApplicationController
  before_action :set_invoice, only: [:show, :edit, :email, :stripe, :mark_paid, :update, :destroy]

  def index
    @notableInvoices = Invoice.all.unpaid + Invoice.all.recent
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
		@copied_invoice = nil
		if params[:copied_id].present?
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
      params.require(:invoice).permit(:client_id, :project_id, :date, :worktype, :cost, :paid, :paiddate, :paymenttype, :description, :access_token)
    end

    def move_drive_doc_to_paid
      #session = GoogleDrive::Session.from_config('config/google.json')
      #file = session.file_by_title(@invoice.pdfFileName)
      #logger.debug file
    end
end
