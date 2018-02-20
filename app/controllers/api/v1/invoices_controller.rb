class Api::V1::InvoicesController < Api::ApiController
  before_action :set_invoice, only: [:show, :email]

  def index
    @invoices = Invoice.all
    respond_with @invoices
  end

  def show
    respond_with @invoice
  end

  def create
    @invoice = Invoice.new(invoice_params)

    if @invoice.save
      render json: { message: 'Invoice created.', invoice_id: @invoice.id }
    else
      render json: { error: 'Unauthorized' }, status: 500
    end
  end

  def email
    InvoiceMailer.invoice_email(@invoice).deliver
    render json: { message: 'Email sent.' }
  end

  private
    def set_invoice
      @invoice = Invoice.find(params[:id])
    end

    def invoice_params
      params.require(:invoice).permit(:client_id, :project_id, :date, :worktype, :cost, :paid, :paiddate, :paymenttype, :description, :access_token)
    end

end
