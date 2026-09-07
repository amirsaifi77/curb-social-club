# Be sure to restart your server when you modify this file.

# The web app calls the API from a different origin (docs/architecture.md).
# WEB_ORIGIN is the deployed web origin; the Vite dev server is allowed in
# development. Mobile does not send an Origin header.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*[ ENV["WEB_ORIGIN"], ("http://localhost:5173" if Rails.env.development?) ].compact)

    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head]
  end
end
