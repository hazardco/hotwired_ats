Rails.application.routes.draw do
  get 'dashboard/show'
  root to: 'dashboard#show'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
