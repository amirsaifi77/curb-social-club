module Api
  module V1
    class MeController < ApplicationController
      before_action :require_user!

      # GET /v1/me
      def show
        render_data UserResource.new(current_user).to_h
      end

      # PATCH /v1/me { profile: { handle, display_name } } (Phase 0 subset, R-13)
      def update
        profile = current_user.profile
        profile.update!(profile_params)
        render_data UserResource.new(current_user.reload).to_h
      end

      # DELETE /v1/me: soft delete now, purge in 30 days (R-14)
      def destroy
        user = current_user
        now = Time.current
        User.transaction do
          user.update!(status: "deleted", deleted_at: now)
          user.sessions.delete_all
          user.devices.find_each(&:unlink!)
        end
        AccountDeletionJob.perform_later(user.id)
        render_data({ purge_after: user.purge_after.iso8601 }, status: :accepted)
      end

      private

      def profile_params
        params.require(:profile).permit(:handle, :display_name)
      end
    end
  end
end
