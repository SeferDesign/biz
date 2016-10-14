Biz::Application.routes.draw do

  if Rails.env.production?
    constraints(:host => /^(?!biz\.seferdesign\.com)/i) do
      match "/(*path)" => redirect {
        |params, req| "https://biz.seferdesign.com/#{params[:path]}"
      },  via: [:get, :post]
    end
  end

  devise_for :users, :skip => [:registrations]
  resources :years
  resources :goals
  resources :invoices do
  	resources :lines
    member do
      get :email
    end
  end
  resources :projects
  resources :clients

  root 'welcome#index'

  get ':action' => 'welcome#:action'

  get 'invoices_controller/populate', to: 'invoices#populate'
  get 'charts_controller/trailing_x_months/:number_of_months', to: 'charts#trailing_x_months', as: 'chart_trailing_x_months'
  get 'charts_controller/year_by_month/:id', to: 'charts#year_by_month', as: 'chart_year_by_month'

end
