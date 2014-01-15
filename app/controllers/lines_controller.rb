class LinesController < ApplicationController
	
	def create
    @invoice = Invoice.find(params[:invoice_id])
    @line = @invoice.lines.create(params[:line].permit(:description, :hourly, :hours, :rate, :total))
    @invoice.update(:cost => @invoice.lines.sum('total'))
    redirect_to invoice_path(@invoice)
  end
  
  def destroy
    @invoice = Invoice.find(params[:invoice_id])
    @line = @invoice.lines.find(params[:id])
    @line.destroy
    @invoice.update(:cost => @invoice.lines.sum('total'))
    redirect_to invoice_path(@invoice)
  end
  
end
