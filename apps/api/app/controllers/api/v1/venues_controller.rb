module Api
  module V1
    # GET /v1/venues/search (docs/api.md Venues): the Phase 2 venue picker
    # and any client that cannot geocode on device. S05 place search uses
    # MapKit locally (discovery R-20) and does not call this.
    class VenuesController < ApplicationController
      include HostPages

      def search
        query = Geo::EventFilters.parse_query(params[:q])
        raise Geo::ParamError, "Send q to search venues." if query.blank?

        result = Venues::Search.call(query: query, origin: Geo::Coordinates.origin(params[:near]))
        public_cache
        render json: { data: { venues: result[:venues].map { |venue| VenueResource.new(venue).to_h },
                               suggestions: result[:suggestions] } }
      end
    end
  end
end
