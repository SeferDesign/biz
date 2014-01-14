class InvoicesController < ApplicationController
  before_action :set_invoice, only: [:show, :edit, :update, :destroy]

  def index
    @invoices = Invoice.all
  end

  def show
  	respond_to do |format|
      format.html
      format.pdf do
        render 	:pdf => 'file',
        				:disposition => 'inline',
        				:layout => 'layouts/pdf/pdf.html',
        				:template => 'invoices/show.html.erb',
        				:user_style_sheet => '/invoices/style.css',
        				:disable_internal_links => true,
        				:disable_external_links => true,
        				:header => {
        					:center => 'Sefer Design Company'
        				}
      end
    end
  end

  def new
    @invoice = Invoice.new
  end

  def edit
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
      params.require(:invoice).permit(:clientid, :projectid, :date, :worktype, :cost, :paid, :paiddate, :paymenttype, :description)
    end
end
