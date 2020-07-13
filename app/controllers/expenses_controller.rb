class ExpensesController < ApplicationController
  include ApplicationHelper
  before_action :set_expense, only: [:show, :edit, :update, :destroy]

  def index
    if params[:future] == 'true'
      @expenses = Expense.future.all
    elsif params[:inactive] == 'true'
      @expenses = Expense.past.all
    else
      @expenses = Expense.recent.all
    end
  end

  def show
  end

  def new
    @expense = Expense.new
  end

  def edit
  end

  def create
    @expense = Expense.new(expense_params)

    if params[:expense_type] == 'monthly'
      created_counter = 1
      1.upto(12) do |month|
        if params["additionalmonths-#{month}"].present?
          working_day = @expense.date.day
          if Time.days_in_month(month, @expense.date.year) < working_day
            working_day = Time.days_in_month(month, @expense.date.year)
          end
          working_date = @expense.date.year.to_s + '-' + month.to_s + '-' + working_day.to_s
          working_date = working_date.to_date
          e = Expense.new(name: @expense.name, vendor_id: @expense.vendor_id, date: working_date, cost: @expense.cost, account: @expense.account, notes: @expense.notes)
          e.save
          created_counter += 1
        end
      end
      notice = created_counter.to_s + ' expenses were successfully created.'
    else
      notice = 'Expense was successfully created.'
    end

    if @expense.save
      redirect_to @expense, notice: notice
    else
      render :new
    end
  end

  def update
    if @expense.update(expense_params)
      redirect_to @expense, notice: 'Expense was successfully updated.'
    else
      render :edit
    end
  end

  def destroy
    @expense.destroy
    redirect_to expenses_url, notice: 'Expense was successfully destroyed.'
  end

  def bulk_new
    if request.post?
      if params[:date].present?
        created_counter = 0
        (0..(params[:date].length - 1)).each do |e|
          expense = Expense.new(name: params[:name][e], vendor_id: params[:vendor_id][e], date: params[:date][e], cost: params[:cost][e], account: expense_account_types[0], notes: '')
          expense.save
          created_counter += 1
        end
        redirect_to expenses_url, notice: created_counter.to_s + ' expenses were successfully created.'
      end
    else
    end
  end

  private
    def set_expense
      @expense = Expense.find(params[:id])
    end

    def expense_params
      params.require(:expense).permit(:name, :vendor_id, :date, :cost, :notes, :account)
    end
end
