Biz::Application.routes.draw do

  resources :invoices do
  	resources :lines
  end
  resources :projects
  resources :clients

	root "welcome#index"
	
end
