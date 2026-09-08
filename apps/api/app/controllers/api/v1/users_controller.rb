module Api
  module V1
    # Public profile reads (profiles-and-follow R-7, R-8). A suspended or
    # deleted account is 404 everywhere, as if the handle never existed.
    class UsersController < ApplicationController
      include HostPages

      # GET /v1/users/:handle
      def show
        profile = find_profile or return
        viewer_cache
        render_data ProfileResource.new(profile, params: { viewer: current_user }).to_h
      end

      # GET /v1/users/:handle/events
      def events
        profile = find_profile or return
        public_cache
        render_events(host_events_page(host: "user:#{profile.user_id}"))
      end

      # GET /v1/users/:handle/clubs: ClubSummary with the member's role.
      def clubs
        profile = find_profile or return
        memberships = Clubs::Memberships.visible_for(profile.user_id)
        public_cache
        render json: { data: ClubSummaryResource.new(memberships.map(&:club),
                                                     params: { roles: Clubs::Memberships.roles(memberships) }).to_h,
                       meta: { next_cursor: nil, total: nil } }
      end

      private

      def find_profile
        profile = Profile.includes(:user).find_by(handle: params[:handle].to_s.downcase)
        return profile if profile&.user&.active?

        render_not_found("User")
        nil
      end

      def viewer_cache
        current_user ? no_store : public_cache
      end
    end
  end
end
