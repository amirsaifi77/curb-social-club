Rails.application.routes.draw do
  mount Rswag::Api::Engine => "/"
  mount Rswag::Ui::Engine => "/api-docs" if Rails.env.development?

  # Rails boot check for load balancers; the JSON health endpoint is /v1/health.
  get "up" => "rails/health#show", as: :rails_health_check

  scope module: :api do
    namespace :v1 do
      get "health", to: "health#show"
    end
  end
end
