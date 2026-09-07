# Sponsor detail (docs/api.md): SponsorSummary plus the page's own fields
# and up to three upcoming meets, each labelled host or sponsor (R-8).
class SponsorResource < SponsorSummaryResource
  UPCOMING_LIMIT = 3

  attribute(:description) { |sponsor| sponsor.description }
  attribute(:banner_url) { |sponsor| MediaUrls.attachment(sponsor.banner) }
  attribute(:website) { |sponsor| sponsor.website }
  attribute(:links) { |sponsor| sponsor.links }
  attribute(:events_count) { |sponsor| sponsor.events_count }

  attribute :upcoming_events do |sponsor|
    Hosts::UpcomingEvents.for(sponsor, limit: UPCOMING_LIMIT).map do |hit|
      EventSummaryResource.new(hit).to_h.merge(relation: Hosts::UpcomingEvents.relation(hit.event, sponsor))
    end
  end

  attribute(:viewer) { { following: false } }
end
