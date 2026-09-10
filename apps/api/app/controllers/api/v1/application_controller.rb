module Api
  module V1
    # Base controller for every /v1 endpoint. Renders the error envelope from
    # docs/api.md: { error: { code, message, details } }. Public read
    # endpoints stay anonymous (README principle); write endpoints call
    # require_user!.
    class ApplicationController < ActionController::API
      include Authenticate
      include Pundit::Authorization
      # Gives MediaUrls the request host, so attachment URLs come back absolute.
      include ActiveStorage::SetCurrent

      rescue_from ActiveRecord::RecordNotFound do |e|
        render_error :not_found, e.message, status: :not_found
      end

      rescue_from ActionController::ParameterMissing do |e|
        render_error :bad_request, e.message, status: :bad_request
      end

      rescue_from ActiveRecord::RecordInvalid do |e|
        render_error :validation_failed, e.record.errors.full_messages.first.to_s,
                     status: :unprocessable_entity, details: e.record.errors.to_hash
      end

      rescue_from Pundit::NotAuthorizedError do
        render_error :forbidden, "You are not allowed to do that", status: :forbidden
      end

      rescue_from Auth::InvalidToken do
        render_error :unauthenticated, "Couldn't verify the sign-in", status: :unauthorized
      end

      rescue_from Auth::Suspended do
        render_error :forbidden, "This account is suspended", status: :forbidden, details: { reason: "suspended" }
      end

      private

      def render_error(code, message, status:, details: nil)
        body = { code: code, message: message }
        body[:details] = details if details
        render json: { error: body }, status: status
      end

      def render_data(payload, status: :ok)
        render json: { data: payload }, status: status
      end

      # docs/api.md Conventions: public GETs are cacheable for 30 seconds.
      # Anything viewer-specific or param-determined calls no_store instead.
      def public_cache
        expires_in 30.seconds, public: true, stale_while_revalidate: 300.seconds
      end

      def no_store
        response.cache_control.replace(no_store: true)
      end
    end
  end
end
