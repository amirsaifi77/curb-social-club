module Api
  module V1
    # Club read endpoints (clubs R-6 to R-9) and the Phase 7 writes, which
    # exist so the client contract is stable and answer 403 not_enabled
    # while `clubs_self_service` is off (R-10).
    class ClubsController < ApplicationController
      include HostPages

      MEMBERS_SORT = "club_members".freeze

      # GET /v1/clubs
      def index
        page = Hosts::Directory.call(Club, params)
        public_cache
        render json: { data: ClubSummaryResource.new(page.items).to_h,
                       meta: { next_cursor: page.next_cursor, total: nil } }
      end

      # GET /v1/clubs/:slug
      def show
        club = find_club or return
        viewer_cache
        render_data ClubResource.new(club, params: { viewer: current_user }).to_h
      end

      # GET /v1/clubs/:slug/events
      def events
        club = find_club or return
        public_cache
        render_events(host_events_page(host: "club:#{club.id}"))
      end

      # GET /v1/clubs/:slug/members (R-8)
      def members
        club = find_club or return
        page = paginate_members(club)
        viewer_cache
        render json: { data: page.items.map { |membership| member_row(membership) },
                       meta: { next_cursor: page.next_cursor, total: nil } }
      end

      def create = stub
      def update = stub
      def join = stub
      def leave = stub
      def invites = stub
      def invite_code = stub
      def update_member = stub
      def remove_member = stub

      private

      def stub
        require_feature!(:clubs_self_service, HostPages::CLUBS_NOT_ENABLED)
      end

      def find_club
        club = Club.find_by(slug: params[:slug])
        return club if club && ClubPolicy.new(current_user, club).show?

        render_not_found("Club")
        nil
      end

      def member_row(membership)
        MiniProfileResource.new(membership.user.profile).to_h.merge(role: membership.role)
      end

      def paginate_members(club)
        limit = Geo::ListQuery.parse_limit(params[:limit])
        scope = club.memberships.active.includes(user: :profile)
                    .where.not(user_id: Blocks.excluded_ids(current_user))
                    .order(:created_at, :id)
        scope = after_member_cursor(scope) if params[:cursor].present?
        rows = scope.limit(limit + 1).to_a
        more = rows.size > limit
        rows = rows.first(limit)
        cursor = more ? Geo::Cursor.encode(MEMBERS_SORT, [ rows.last.created_at.utc.iso8601(6), rows.last.id ]) : nil
        Geo::Page.new(items: rows, next_cursor: cursor)
      end

      def after_member_cursor(scope)
        created_at, id = Geo::Cursor.decode(params[:cursor], sort: MEMBERS_SORT, size: 2)
        raise Geo::ParamError, Geo::Cursor::INVALID unless id.to_s.match?(Device::UUID)

        scope.where("(club_memberships.created_at, club_memberships.id) > (?::timestamptz, ?::uuid)",
                    Time.iso8601(created_at.to_s), id)
      rescue ArgumentError, TypeError
        raise Geo::ParamError, Geo::Cursor::INVALID
      end

      # The viewer block and the member list depend on who is asking.
      def viewer_cache
        current_user ? no_store : public_cache
      end
    end
  end
end
