class GoalsController < ApplicationController
  before_action :set_goal, only: [:show, :edit, :update, :destroy]

  def index
    @goals = Goal.all.sort { |a,b| b.enddate <=> a.enddate }
  end

  def show
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
