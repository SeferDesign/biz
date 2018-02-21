class Api::V1::LinesController < Api::ApiController
  before_action :set_invoice

  def create
    @line = @invoice.lines.create(params[:line].permit(:description, :hourly, :hours, :rate, :total, :discount))
    @invoice.update(:cost => @invoice.lines.sum('total'))
    render json: { message: 'Line created.', line_id: @line.id }
  end

  private
    def set_invoice
      @invoice = Invoice.find(params[:invoice_id])
    end

end
