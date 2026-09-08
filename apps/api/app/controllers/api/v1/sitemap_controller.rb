module Api
  module V1
    # GET /v1/sitemap (web R-4): the slugs the web app builds sitemap.xml
    # from. Public, non-hidden, non-dormant rows only; events need an
    # upcoming scheduled occurrence. Cached for an hour.
    class SitemapController < ApplicationController
      CACHE_TTL = 1.hour

      def show
        payload = Rails.cache.fetch("sitemap:v1", expires_in: CACHE_TTL) { build }
        expires_in CACHE_TTL, public: true
        render json: payload
      end

      private

      def build
        { events: rows(Event.listed.where(id: EventOccurrence.scheduled.upcoming.select(:event_id))),
          clubs: rows(Club.visible),
          sponsors: rows(Sponsor.visible),
          # Spots arrive in Phase 4; the key ships now so the web sitemap
          # builder does not need a change then.
          spots: [] }
      end

      def rows(scope)
        scope.order(:slug).pluck(:slug, :updated_at)
             .map { |slug, updated_at| { slug: slug, updated_at: updated_at.utc.iso8601 } }
      end
    end
  end
end
