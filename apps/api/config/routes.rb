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
    # api_only drops new and edit from the default resource actions, so the
    # admin's HTML forms name them explicitly.
    resources :venues, only: %i[index new create show edit update destroy]
    # A04 (admin.md R-15 to R-17). No destroy: an event is cancelled or
    # hidden, never deleted, so shared links keep resolving.
    resources :events, only: %i[index new create edit update] do
      member do
        post :verify
        post :confirm
        post :rematerialize
      end
      resources :occurrences, only: %i[index create edit update], module: :events do
        member do
          post :cancel
          post :reset
        end
      end
    end
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

      # Public reads (docs/api.md Events); the collection routes come before
      # /events/:slug (1.4) so "map" is never taken for a slug.
      resources :events, only: %i[index] do
        collection { get :map }
      end
      # Public reads address an event by slug; writes and nested reads use
      # the id (docs/api.md Conventions). Both come after the collection
      # routes so "map" is never taken for a slug.
      get "events/:slug", to: "events#show", as: :event
      post "events/:id/confirm", to: "events#confirm"
      get "events/:id/occurrences", to: "occurrences#index"
      resources :occurrences, only: %i[show]

      # Host pages (docs/api.md Clubs, Sponsors, Users and follows). Reads
      # are anonymous; every write is a Phase 7 stub returning 403
      # not_enabled while its feature flag is off.
      resources :clubs, only: %i[index create], param: :slug do
        member do
          get :events
          get :members
        end
      end
      get "clubs/:slug", to: "clubs#show"
      patch "clubs/:id", to: "clubs#update"
      put "clubs/:id/membership", to: "clubs#join"
      delete "clubs/:id/membership", to: "clubs#leave"
      post "clubs/:id/invites", to: "clubs#invites"
      post "clubs/:id/invite_code", to: "clubs#invite_code"
      patch "clubs/:id/members/:user_id", to: "clubs#update_member"
      delete "clubs/:id/members/:user_id", to: "clubs#remove_member"

      resources :sponsors, only: %i[index], param: :slug do
        member { get :events }
      end
      get "sponsors/:slug", to: "sponsors#show"
      patch "sponsors/:id", to: "sponsors#update"

      # Discovery surfaces (docs/api.md Feed, Venues, System).
      get "feed", to: "feed#index"
      get "sitemap", to: "sitemap#show"
      get "venues/search", to: "venues#search"

      get "users/:handle", to: "users#show"
      get "users/:handle/events", to: "users#events"
      get "users/:handle/clubs", to: "users#clubs"
    end
  end
end
