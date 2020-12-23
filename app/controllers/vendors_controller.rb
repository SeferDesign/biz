class VendorsController < ApplicationController
  before_action :set_vendor, only: [:show, :edit, :update, :destroy]

  def index
		@vendors = Vendor.all.sort_by{ |vendor| vendor.sortable_name }
  end

  def show
  end

  def new
    @vendor = Vendor.new
  end

  def edit
  end

  def create
    @vendor = Vendor.new(vendor_params)

    if @vendor.save
      redirect_to @vendor, notice: 'Vendor was successfully created.'
    else
      render :new
    end
  end

  def update
    if @vendor.update(vendor_params)
      redirect_to @vendor, notice: 'Vendor was successfully updated.'
    else
      render :edit
    end
  end

  def destroy
    @vendor.destroy
    redirect_to vendors_url, notice: 'Vendor was successfully destroyed.'
  end

  private
    def set_vendor
      @vendor = Vendor.find(params[:id])
    end

    def vendor_params
      params.require(:vendor).permit(:name, :category, :notes)
    end
end
