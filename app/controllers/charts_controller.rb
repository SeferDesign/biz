class ChartsController < ApplicationController
  before_action :set_number_of_months, only: [:trailing_x_months]
  before_action :set_year, only: [:year_by_month]

  def trailing_x_months
    months = []
    @number_of_months.downto(0).each do |m|
      months.push([m.month.ago.strftime("%B"), Invoice.paidByMonth(m.month.ago).sum('cost').to_f])
    end
    render json: months
  end

  def year_by_month
    months = []
    (1..12).each do |m|
      months.push([Date::ABBR_MONTHNAMES[m], Invoice.paidByMonth(Date.new(@year.year, m, 1)).sum('cost').to_f])
    end
    render json: months
  end

  private
    def set_number_of_months
      @number_of_months = params[:number_of_months].to_i - 1
    end

    def set_year
      @year = Year.find(params[:id])
    end

end
