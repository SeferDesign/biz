class YearsController < ApplicationController
  before_action :set_year, only: [:show, :edit, :update, :destroy]

  def index
    @years = Year.all.sort { |a,b| a.year <=> b.year }
  end

  def show
    @year = Year.friendly.find(params[:id])

    @invoicesPaid = Invoice.paidByYear(@year.year)
    @incomeYear = @invoicesPaid.sum('cost')

    @paidClients = SortedSet.new
    @invoicesPaid.each do |invoice|
      @paidClients.add(invoice.client)
    end

    @paidClients = @paidClients.sort { |a,b| b.yearPaidInvoices(@year.year).sum(:cost) <=> a.yearPaidInvoices(@year.year).sum(:cost) }

    @invoicesUnpaid = Invoice.unpaid.where("date >= ? AND date <= ?", Date.new(@year.year, 1, 1), Date.new(@year.year, 12, 31))

    @incomeQ1 = Invoice.paidByQ1(@year.year).sum('cost')
    @incomeQ2 = Invoice.paidByQ2(@year.year).sum('cost')
    @incomeQ3 = Invoice.paidByQ3(@year.year).sum('cost')
    @incomeQ4 = Invoice.paidByQ4(@year.year).sum('cost')

    respond_to do |format|
      format.html
      format.csv do
        headers['Content-Disposition'] = "attachment; filename=\"#{@year.year}paidinvoices\.csv\""
        headers['Content-Type'] ||= 'text/csv'
      end
    end

  end

  def new
    @year = Year.new
  end

  def edit
  end

  def create
    @year = Year.new(year_params)

    respond_to do |format|
      if @year.save
        format.html { redirect_to @year, notice: 'Year was successfully created.' }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
    respond_to do |format|
      if @year.update(year_params)
        format.html { redirect_to @year, notice: 'Year was successfully updated.' }
      else
        format.html { render action: 'edit' }
      end
    end
  end

  def destroy
    @year.destroy
    respond_to do |format|
      format.html { redirect_to years_url }
    end
  end

  private
    def set_year
      @year = Year.friendly.find(params[:id])
    end

    def year_params
      params.require(:year).permit(:year, :taxrate)
    end
end
