class InvoicesController < ApplicationController
  before_action :set_invoice, only: [:show, :edit, :email, :update, :destroy]

  def index
    @notableInvoices = Invoice.all.unpaid + Invoice.all.recent
  end

  def show
    if @invoice.client.currentrate
      currentrate = sprintf("%.2f", @invoice.client.currentrate)
      @ratePlaceholder = "Rate ($#{currentrate})"
    else
      @ratePlaceholder = 'Rate'
    end
  	respond_to do |format|
      format.html
      format.pdf do
        render 	:pdf => Client.find(@invoice.client_id).name.gsub(/[^0-9A-Za-z]/, '') + @invoice.date.to_s,
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
            "value":"<http://' + request.domain + '/clients/' + @invoice.client.id.to_s + '|' + @invoice.client.name + '>",
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
            "value":"<http://' + request.domain + '/invoices/' + @invoice.id.to_s + '|/invoices/' + @invoice.id.to_s + '>",
            "short":true
          }
        ]
      }]
    }'}
  end

  def populate
    @client = Client.find(params[:client_id])
    respond_to do |format|
      format.js
    end
  end

  def create
    @invoice = Invoice.new(invoice_params)

    respond_to do |format|
      if @invoice.save
        format.html { redirect_to @invoice, notice: 'Invoice was successfully created.' }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
    respond_to do |format|
      if @invoice.update(invoice_params)
        format.html { redirect_to @invoice, notice: 'Invoice was successfully updated.' }
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
      params.require(:invoice).permit(:client_id, :project_id, :date, :worktype, :cost, :paid, :paiddate, :paymenttype, :description)
    end
end
