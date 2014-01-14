Biz::Application.routes.draw do

  resources :invoices

  resources :projects

  resources :clients

	root "welcome#index"
	
end
