# Shared plumbing for the club, sponsor, and user host pages: the 400 for a
# bad query parameter, the feature-flag stub every Phase 7 write returns,
# and the event list a host page shows.
module HostPages
  extend ActiveSupport::Concern

  CLUBS_NOT_ENABLED = "Club tools are coming after launch. Until then, email hello@curbsocial.club to update your club.".freeze
  SPONSORS_NOT_ENABLED = "Sponsor tools are coming after launch. Email hello@curbsocial.club to update your page.".freeze

  included do
    rescue_from Geo::ParamError do |e|
      no_store
      render_error :bad_request, e.message, status: :bad_request
    end
  end

  private

  # clubs R-10, sponsors R-11: the endpoint exists so the client contract
  # is stable, and answers 403 not_enabled until its flag is on.
  def require_feature!(flag, message)
    return true if Features.enabled?(flag)

    no_store
    render_error :not_enabled, message, status: :forbidden
    false
  end

  def render_not_found(what)
    no_store
    render_error :not_found, "#{what} not found", status: :not_found
  end

  # The host page's meets: upcoming by default, most recent first with
  # past=true (docs/api.md Clubs).
  def host_events_page(filter)
    Geo::EventsList.call(ActionController::Parameters.new(
                           filter.merge(params.permit(:limit, :cursor, :past, :from, :to).to_h.symbolize_keys)
                         ))
  end

  def render_events(page, &block)
    rows = page.items.map { |hit| block ? block.call(hit) : EventSummaryResource.new(hit).to_h }
    render json: { data: rows, meta: { next_cursor: page.next_cursor, total: nil } }
  end
end
