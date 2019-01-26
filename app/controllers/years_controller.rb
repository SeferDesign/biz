class YearsController < ApplicationController
  before_action :set_year, only: [:show, :income, :expenses, :edit, :update, :destroy]

  def index
    @years = Year.all.sort { |a,b| a.year <=> b.year }
  end

  def show
  end

  def income
    respond_to do |format|
      format.csv do
        headers['Content-Disposition'] = "attachment; filename=\"#{@year.year}paidinvoices\.csv\""
        headers['Content-Type'] ||= 'text/csv'
      end
    end
  end

  def expenses
    respond_to do |format|
      format.csv do
        headers['Content-Disposition'] = "attachment; filename=\"#{@year.year}expenses\.csv\""
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
		@year.goals_months = params[:goals_months].map(&:to_i)

    respond_to do |format|
      if @year.save
        format.html { redirect_to @year, notice: 'Year was successfully created.' }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
		@year.goals_months = params[:goals_months].map(&:to_i)
		@year.save
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
      params.require(:year).permit(:year, :taxrate, :goal_year, :goals_months)
    end
end
