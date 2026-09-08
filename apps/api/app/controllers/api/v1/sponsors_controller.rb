module Api
  module V1
    # Sponsor read endpoints (sponsors R-6 to R-9) and the Phase 7 update,
    # which answers 403 not_enabled while `sponsors_self_service` is off
    # (R-11).
    class SponsorsController < ApplicationController
      include HostPages

      # GET /v1/sponsors
      def index
        page = Hosts::Directory.call(Sponsor, params)
        public_cache
        render json: { data: SponsorSummaryResource.new(page.items).to_h,
                       meta: { next_cursor: page.next_cursor, total: nil } }
      end

      # GET /v1/sponsors/:slug
      def show
        sponsor = find_sponsor or return
        cache_for(sponsor, SponsorPolicy)
        render_data SponsorResource.new(sponsor).to_h
      end

      # GET /v1/sponsors/:slug/events: hosted plus attached, each labelled
      # with its relation, host winning when both apply (R-8).
      def events
        sponsor = find_sponsor or return
        cache_for(sponsor, SponsorPolicy)
        render_events(host_events_page(sponsor: sponsor.id)) do |hit|
          EventSummaryResource.new(hit).to_h.merge(relation: Hosts::UpcomingEvents.relation(hit.event, sponsor))
        end
      end

      def update
        require_feature!(:sponsors_self_service, HostPages::SPONSORS_NOT_ENABLED)
      end

      private

      def find_sponsor
        sponsor = Sponsor.find_by(slug: params[:slug])
        return sponsor if sponsor && SponsorPolicy.new(current_user, sponsor).show?

        render_not_found("Sponsor")
        nil
      end
    end
  end
end
