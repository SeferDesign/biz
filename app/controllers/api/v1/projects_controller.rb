class Api::V1::ProjectsController < Api::ApiController
  before_action :set_project, only: [:show]

  def index
    @projects = Project.all
    respond_with @projects
  end

  def show
    render json: @project
  end

  private
    def set_project
      @project = Project.find(params[:id])
    end

end
