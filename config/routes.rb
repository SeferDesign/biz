Biz::Application.routes.draw do

  resources :years
  resources :goals
  resources :invoices do
  	resources :lines
  end
  resources :projects
  resources :clients

	root 'welcome#index'
	
	get ':action' => 'welcome#:action'
	
end
