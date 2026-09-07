module Api
  module V1
    # Base controller for every /v1 endpoint. Renders the error envelope from
    # docs/api.md: { error: { code, message, details } }. Auth arrives in
    # session 0.5; public read endpoints stay anonymous (README principle).
    class ApplicationController < ActionController::API
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

      private

      def render_error(code, message, status:, details: nil)
        body = { code: code, message: message }
        body[:details] = details if details
        render json: { error: body }, status: status
      end
    end
  end
end
