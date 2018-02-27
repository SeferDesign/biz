class ChartsController < ApplicationController
  include ApplicationHelper
  before_action :set_number_of_months, only: [:trailing_x_months]
  before_action :set_data_holders
  before_action :set_year, only: [:year_invoice_month, :year_expense_category, :year_expense_month]

  def trailing_x_months
    @number_of_months.downto(0).each do |m|
      @invoices_data[:data].store(m.month.ago.strftime("%B"), Invoice.paidByMonth(m.month.ago.year, m.month.ago.month).sum('cost').to_f)
      @expenses_data[:data].store(m.month.ago.strftime("%B"), Expense.expenseByMonth(m.month.ago.year, m.month.ago.month).sum('cost').to_f)
    end
    render json: [
      @invoices_data,
      @expenses_data
    ]
  end

  def year_invoice_month
    months = []
    (1..12).each do |m|
      @invoices_data[:data].store(Date::ABBR_MONTHNAMES[m], Invoice.paidByMonth(@year.year, m).sum('cost').to_f)
    end
    render json: [@invoices_data]
  end

  def year_expense_category
    @expenses_data = []
    vendor_categories.each do |cat|
      this_cat_expenses = 0
      @year.expenses.each do |expense|
        if expense.vendor.category == cat
          this_cat_expenses += expense.cost
        end
      end
      if this_cat_expenses > 0
        @expenses_data.push([cat, this_cat_expenses])
      end
    end
    render json: @expenses_data
  end

  def year_expense_month
    (1..12).each do |m|
      @expenses_data[:data].store(Date::ABBR_MONTHNAMES[m], Expense.expenseByMonth(@year.year, m).sum('cost').to_f)
    end
    render json: [@expenses_data]
  end

  private
    def set_number_of_months
      @number_of_months = params[:number_of_months].to_i - 1
    end

    def set_data_holders
      @invoices_data = { name: 'Invoices', data: {} }
      @expenses_data = { name: 'Expenses', data: {} }
    end

    def set_year
      @year = Year.find(params[:id])
    end

end
