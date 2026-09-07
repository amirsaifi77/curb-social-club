module Api
  module V1
    class AuthController < ApplicationController
      before_action :require_user!, only: :destroy

      # POST /v1/auth/apple { identity_token, authorization_code, nonce, full_name? }
      def apple
        params.require(:identity_token)
        claims = Auth::AppleTokenVerifier.new.verify(params[:identity_token], nonce: params[:nonce])
        refresh_token = Auth::AppleClient.new.exchange_code(params[:authorization_code])
        respond_with_sign_in(provider: "apple", claims: claims,
                             display_name: apple_display_name, refresh_token: refresh_token)
      end

      # POST /v1/auth/google { id_token }
      def google
        params.require(:id_token)
        claims = Auth::GoogleTokenVerifier.new.verify(params[:id_token])
        respond_with_sign_in(provider: "google", claims: claims, display_name: claims["name"])
      end

      # DELETE /v1/auth/session: only the calling session (R-12).
      def destroy
        current_session.device&.unlink!
        current_session.destroy!
        head :no_content
      end

      private

      def respond_with_sign_in(**attrs)
        result = Auth::SignIn.new(
          **attrs, device: current_device, ip: request.remote_ip, user_agent: request.user_agent
        ).call
        render_data(
          { token: result.token, user: UserResource.new(result.user).to_h, is_new: result.is_new },
          status: result.is_new ? :created : :ok
        )
      end

      # Apple full_name arrives only on first authorization (R-7).
      def apple_display_name
        name = params[:full_name]
        return nil unless name.respond_to?(:[])

        [ name[:givenName], name[:familyName] ].map { |p| p.to_s.strip }.reject(&:blank?).join(" ").presence
      end
    end
  end
end
