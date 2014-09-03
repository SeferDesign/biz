Biz::Application.routes.draw do

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

end
