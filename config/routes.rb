Biz::Application.routes.draw do

  if Rails.env.production?
    constraints(:host => /^(?!biz\.seferdesign\.com)/i) do
      match "/(*path)" => redirect {
        |params, req| "https://biz.seferdesign.com/#{params[:path]}"
      }, via: [:get, :post]
    end
  end

  match 'expenses/bulk/new', to: 'expenses#bulk_new', as: 'new_bulk_expenses', via: [:get, :post]

  devise_for :users, :skip => [:registrations]
  resources :years do
    member do
      get :income
      get :expenses
    end
  end
  resources :goals
  resources :invoices do
  	resources :lines
    member do
      get :email
      post :stripe
    end
  end
  resources :projects
  resources :clients
  resources :expenses
  resources :vendors

  root 'welcome#index'

  get ':action' => 'welcome#:action'

  get 'invoices_controller/populate', to: 'invoices#populate'
  get 'invoices_controller/generate_crypto_link', to: 'invoices#generate_crypto_link'
  get 'invoices_controller/mark_paid/:id', to: 'invoices#mark_paid', as: 'mark_paid_invoice'
  get 'charts_controller/trailing_x_months/:number_of_months', to: 'charts#trailing_x_months', as: 'chart_trailing_x_months'
  get 'charts_controller/year_invoice_month/:id', to: 'charts#year_invoice_month', as: 'chart_year_by_invoice_month'
  get 'charts_controller/year_expense_category/:id', to: 'charts#year_expense_category', as: 'chart_year_by_expense_category'
  get 'charts_controller/year_expense_month/:id', to: 'charts#year_expense_month', as: 'chart_year_by_expense_month'

  namespace :api, defaults: { format: 'json' } do

    namespace :v1 do
      resources :invoices, only: [:index, :show, :create] do
        resources :lines, only: [:index, :show, :create]
        member do
          get :email
        end
      end
      resources :projects, only: [:index, :show]
      resources :clients, only: [:index, :show]
    end
  end

end
