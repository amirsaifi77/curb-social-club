Rails.application.routes.draw do
  mount Rswag::Api::Engine => "/"
  mount Rswag::Ui::Engine => "/api-docs" if Rails.env.development?

  # Rails boot check for load balancers; the JSON health endpoint is /v1/health.
  get "up" => "rails/health#show", as: :rails_health_check

  # Admin UI (docs/specs/admin.md): server-rendered ERB with cookie sessions.
  # Every route except sign_in and session#create redirects non-admins.
  namespace :admin do
    root to: "dashboard#show"
    get "sign_in", to: "sessions#new"
    resource :session, only: %i[create destroy]
  end
  mount MissionControl::Jobs::Engine => "/admin/jobs"

  scope module: :api do
    namespace :v1 do
      get "health", to: "health#show"

      post "auth/apple", to: "auth#apple"
      post "auth/google", to: "auth#google"
      delete "auth/session", to: "auth#destroy"

      resource :me, only: %i[show update destroy], controller: "me"
      resources :devices, only: %i[create update], param: :anonymous_id
    end
  end
end
