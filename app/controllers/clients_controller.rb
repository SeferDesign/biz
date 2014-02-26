class ClientsController < ApplicationController
  before_action :set_client, only: [:show, :edit, :update, :destroy]

  def index
    @clients = Client.all
  end

  def show
  	@client = Client.find(params[:id])
  	@projects = Project.where(clientid: @client.id)
  	@invoices = Invoice.where(clientid: @client.id).sort { |a,b| a.date <=> b.date }
  end

  def new
    @client = Client.new
  end

  def edit
  end

  def create
    @client = Client.new(client_params)

    respond_to do |format|
      if @client.save
        format.html { redirect_to @client, notice: 'Client was successfully created.' }
      else
        format.html { render action: 'new' }
      end
    end
  end

  def update
    respond_to do |format|
      if @client.update(client_params)
        format.html { redirect_to @client, notice: 'Client was successfully updated.' }
      else
        format.html { render action: 'edit' }
      end
    end
  end
  
  def destroy
    @client.destroy
    respond_to do |format|
      format.html { redirect_to clients_url }
    end
  end

  private
    def set_client
      @client = Client.find(params[:id])
    end

    def client_params
      params.require(:client).permit(:name, :contact, :site_url, :logo, :address1, :address2, :city, :state, :zipcode, :international, :intinfo)
    end
end
