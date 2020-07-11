class InvoicesController < ApplicationController
	before_action :set_invoice, only: [:show, :edit, :email, :stripe, :generate_crypto_link, :mark_paid, :update, :destroy]

  def index
    @notableInvoices = Invoice.all.unpaid + Invoice.all.recent
	end

	def show
		@clientView = false

    if @invoice.client.currentrate
      @ratePlaceholder = "Rate ($#{@invoice.client.currentrate})"
    else
      @ratePlaceholder = 'Rate'
		end

		if params[:access_token].present? and params[:access_token] == @invoice.access_token
			@clientView = true
		end

		if @clientView and !@invoice.paid and @invoice.cost.present? and @invoice.cost >= 0.50
			@session = Stripe::Checkout::Session.create({
				payment_method_types: ['card'],
				customer: @invoice.client.stripe_customer_id,
				line_items: [
					price_data: {
						product_data: {
							name: 'Invoice #' + @invoice.display_id
						},
						unit_amount: (@invoice.stripeChargeCost * 100).to_i,
						currency: 'usd',
					},
					quantity: 1,
				],
				mode: 'payment',
				success_url: invoice_url(@invoice) + '/stripe/?session_id={CHECKOUT_SESSION_ID}&access_token='+ @invoice.access_token,
				cancel_url: invoice_url(@invoice) + '?access_token='+ @invoice.access_token,
			})
			@invoice.stripe_session_id = @session.id
			@invoice.save
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
		existingSends = @invoice.mail_sends || []
		@invoice.update(:mail_sends => existingSends.concat([ DateTime.now ]))
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
		if !params[:session_id].present? or params[:session_id].empty? or params[:session_id] != @invoice.stripe_session_id
			raise 'error'
		else
			@invoice.update(:paid => true, :paymenttype => 'Stripe', :paiddate => Date.today)
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
  end

  def create
		@invoice = Invoice.new(invoice_params)
		if !@invoice.cost.present? or @invoice.cost.empty?
			@invoice.cost = 0
		end

    respond_to do |format|
      if @invoice.save
        format.html { redirect_to @invoice }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
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
      params.require(:invoice).permit(:client_id, :date, :worktype, :cost, :paid, :paiddate, :paymenttype, :description, :access_token, :stripe_session_id, :mail_sends)
		end

end
