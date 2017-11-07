class ChartsController < ApplicationController
  include ApplicationHelper
  before_action :set_number_of_months, only: [:trailing_x_months]
  before_action :set_year, only: [:year_invoice_month, :year_expense_category, :year_expense_month]

  def trailing_x_months
    months = []
    @number_of_months.downto(0).each do |m|
      months.push([m.month.ago.strftime("%B"), Invoice.paidByMonth(m.month.ago.year, m.month.ago.month).sum('cost').to_f])
    end
    render json: months
  end

  def year_invoice_month
    months = []
    (1..12).each do |m|
      months.push([Date::ABBR_MONTHNAMES[m], Invoice.paidByMonth(@year.year, m).sum('cost').to_f])
    end
    render json: months
  end

  def year_expense_category
    categories = []
    vendor_categories.each do |cat|
      this_cat_expenses = 0
      @year.expenses.each do |expense|
        if expense.vendor.category == cat
          this_cat_expenses += expense.cost
        end
      end
      categories.push([cat, this_cat_expenses])
    end
    render json: categories
  end

  def year_expense_month
    months = []
    (1..12).each do |m|
      months.push([Date::ABBR_MONTHNAMES[m], Expense.expenseByMonth(@year.year, m).sum('cost').to_f])
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
