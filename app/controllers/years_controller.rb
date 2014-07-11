class YearsController < ApplicationController
	before_action :set_year, only: [:show, :edit, :update, :destroy]

  def index
    @years = Year.all.sort { |a,b| a.year <=> b.year }
  end

  def show
  	@year = Year.friendly.find(params[:id])

  	@invoicesPaid = Invoice.paidByYear(@year.year)
		@incomeYear = @invoicesPaid.sum('cost')

  	@invoicesUnpaid = Invoice.unpaid.where("date >= ? AND date <= ?", Date.new(@year.year, 1, 1), Date.new(@year.year, 12, 31))

		@incomeQ1 = 	Invoice.paid.where("paiddate >= ? AND paiddate <= ?", Date.new(@year.year, 1, 1), Date.new(@year.year, 3, 31)).sum('cost')
		@incomeQ2 = 	Invoice.paid.where("paiddate >= ? AND paiddate <= ?", Date.new(@year.year, 4, 1), Date.new(@year.year, 6, 30)).sum('cost')
		@incomeQ3 = 	Invoice.paid.where("paiddate >= ? AND paiddate <= ?", Date.new(@year.year, 7, 1), Date.new(@year.year, 9, 30)).sum('cost')
		@incomeQ4 = 	Invoice.paid.where("paiddate >= ? AND paiddate <= ?", Date.new(@year.year, 10, 1), Date.new(@year.year, 12, 31)).sum('cost')

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
