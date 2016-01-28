class LinesController < ApplicationController
	before_action :set_invoice

	def create
    @line = @invoice.lines.create(params[:line].permit(:description, :hourly, :hours, :rate, :total, :discount))
    @invoice.update(:cost => @invoice.lines.sum('total'))
    redirect_to invoice_path(@invoice)
  end

  def destroy
    @invoice.lines.find(params[:id]).destroy
    @invoice.update(:cost => @invoice.lines.sum('total'))
    redirect_to invoice_path(@invoice)
  end

	private
		def set_invoice
			@invoice = Invoice.find(params[:invoice_id])
		end

end
