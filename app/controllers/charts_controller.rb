class ChartsController < ApplicationController
  include ApplicationHelper
  before_action :set_data_holders
  before_action :set_year, only: [:year_invoice_month, :year_invoice_month_with_goal, :year_all_data, :year_expense_category, :year_expense_month]

  def trailing_x_months
    (params[:number_of_months].to_i - 1).downto(0).each do |m|
      @invoices_data[:data].store(m.month.ago.strftime("%B"), Invoice.paidByMonth(m.month.ago.year, m.month.ago.month).sum('cost').to_i)
      @expenses_data[:data].store(m.month.ago.strftime("%B"), Expense.expenseByMonth(m.month.ago.year, m.month.ago.month).sum('cost').to_i)
			@goals_data[:data].store(m.month.ago.strftime("%B"), Year.where(year: m.month.ago.year).first.goals_months[Date::MONTHNAMES.index(m.month.ago.strftime("%B")) - 1].to_i)
    end
    render json: [
      @invoices_data,
      @expenses_data,
			@goals_data
    ]
  end

  def year_invoice_month
    months = []
    (1..12).each do |m|
      @invoices_data[:data].store(Date::ABBR_MONTHNAMES[m], Invoice.paidByMonth(@year.year, m).sum('cost').to_i)
    end
    render json: [@invoices_data]
  end

	def year_invoice_month_with_goal
		months = []
    (1..12).each do |m|
      @invoices_data[:data].store(Date::ABBR_MONTHNAMES[m], Invoice.paidByMonth(@year.year, m).sum('cost').to_i)
			@goals_data[:data].store(Date::ABBR_MONTHNAMES[m], @year.goals_months[m - 1].to_i)
    end
    render json: [
			@invoices_data,
			@goals_data
		]
  end

	def year_all_data
    (1..12).each do |m|
      @invoices_data[:data].store(Date::ABBR_MONTHNAMES[m], Invoice.paidByMonth(@year.year, m).sum('cost').to_i)
			@expenses_data[:data].store(Date::ABBR_MONTHNAMES[m], Expense.expenseByMonth(@year.year, m).sum('cost').to_i)
			@goals_data[:data].store(Date::ABBR_MONTHNAMES[m], @year.goals_months[m - 1].to_i)
    end
    render json: [
			@invoices_data,
			@expenses_data,
			@goals_data
		]
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
			this_cat_expenses = this_cat_expenses.to_i
      if this_cat_expenses > 0
        @expenses_data.push([cat, this_cat_expenses])
      end
    end
    render json: @expenses_data
  end

  def year_expense_month
    (1..12).each do |m|
      @expenses_data[:data].store(Date::ABBR_MONTHNAMES[m], Expense.expenseByMonth(@year.year, m).sum('cost').to_i)
    end
    render json: [@expenses_data]
  end

  private
    def set_data_holders
      @invoices_data = { name: 'Invoices', data: {} }
      @expenses_data = { name: 'Expenses', data: {} }
			@goals_data = { name: 'Goal', data: {} }
    end

    def set_year
      @year = Year.find(params[:id])
    end

end
