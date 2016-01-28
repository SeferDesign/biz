class GoalsController < ApplicationController
  before_action :set_goal, only: [:show, :edit, :update, :destroy]

  def index
    if params[:showall] == 'true'
      @goals = Goal.all.sort { |a,b| b.enddate <=> a.enddate }
    else
      @goals = Goal.recent.sort { |a,b| b.enddate <=> a.enddate }
    end
  end

  def show
    if @goal.timeperiod == 'Month'
      @invoicesPaid = Invoice.paidByMonth(@goal.startdate.year, @goal.startdate.month)
    elsif @goal.timeperiod == 'Year'
      @invoicesPaid = Invoice.paidByYear(@goal.startdate.year)
    end

    @progressRaw = @goal.actualamount / @goal.amount
    @progress = @progressRaw * 100

    if @goal.status == 'Current'

      @fullPeriodDays = (@goal.enddate - @goal.startdate + 1).to_f
      @paceDays = (Date.today - @goal.startdate + 1).to_f
      @paceRaw = @paceDays / @fullPeriodDays
      @pace = @paceRaw * 100

      if @progressRaw > @paceRaw
        @firstLengthRaw = @paceRaw
        @firstLength = @pace
        @secondLength = (@progressRaw - @paceRaw) * 100
      else
        @firstLengthRaw = @progressRaw
        @firstLength = @progress
        @secondLength = (@paceRaw - @firstLengthRaw) * 100
      end

    end

  end

  def new
    @goal = Goal.new
  end

  def edit
  end

  def create
    @goal = Goal.new(goal_params)

    respond_to do |format|
      if @goal.save
        format.html { redirect_to @goal, notice: 'Goal was successfully created.' }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
    respond_to do |format|
      if @goal.update(goal_params)
        format.html { redirect_to @goal, notice: 'Goal was successfully updated.' }
      else
        format.html { render action: 'edit' }
      end
    end
  end

  def destroy
    @goal.destroy
    respond_to do |format|
      format.html { redirect_to goals_url }
    end
  end

  private
    def set_goal
      @goal = Goal.find(params[:id])
    end
    def goal_params
      params.require(:goal).permit(:startdate, :enddate, :status, :met, :timeperiod, :goaltype, :amount)
    end
end
