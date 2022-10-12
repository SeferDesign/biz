class ClientsController < ApplicationController
	before_action :set_client, only: [:show, :edit, :update, :destroy]

  def index
		@clientsRecent = Client.all.sort { |a,b| a.mostRecentActivityDate <=> b.mostRecentActivityDate }.reverse.take(10)
		@clientsAll = Client.all
  end

  def show
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
      params.require(:client).permit(:name, :contact, :email_accounting, :email_accounting_2, :email_accounting_3, :site_url, :logo, :address1, :address2, :city, :state, :zipcode, :international, :intinfo, :preferred_paymenttype, :currentrate, :federalein, :gsheet_id, :stripe_customer_id)
    end
end
