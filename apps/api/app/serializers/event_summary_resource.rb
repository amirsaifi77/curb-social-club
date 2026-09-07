# EventSummary (docs/api.md) from a Geo::EventHit: the event, its earliest
# scheduled occurrence in the window, the SQL distance, and stale (R-25).
# sponsors_preview holds at most two sponsorships by position (sponsors
# spec R-9); the hidden-sponsor filter lands in 1.6.
class EventSummaryResource
  include Alba::Resource

  PREVIEW_SIZE = 2

  attribute(:id) { |hit| hit.event.id }
  attribute(:slug) { |hit| hit.event.slug }
  attribute(:title) { |hit| hit.event.title }
  attribute(:cover_url) { |hit| MediaUrls.attachment(hit.event.cover) }
  attribute(:cover_blurhash) { nil }
  attribute(:tags) { |hit| hit.event.tags }
  attribute(:recurring) { |hit| hit.event.recurring? }
  attribute(:rrule_text) { |hit| hit.event.rrule_text }
  attribute(:host) { |hit| hit.event.host ? HostResource.new(hit.event.host).to_h : nil }

  attribute :venue do |hit|
    venue = hit.event.venue
    { id: venue.id, name: venue.name, city: venue.city,
      location: { lat: venue.location.y.round(6), lng: venue.location.x.round(6) } }
  end

  attribute :next_occurrence do |hit|
    occurrence = hit.next_occurrence
    next nil if occurrence.nil?

    { id: occurrence.id, starts_at: occurrence.starts_at.utc.iso8601, ends_at: occurrence.ends_at.utc.iso8601,
      timezone: hit.event.timezone, going_count: occurrence.going_count, status: occurrence.status }
  end

  attribute(:distance_m, &:distance_m)
  attribute(:source) { |hit| hit.event.source_url ? { type: hit.event.source_type, url: hit.event.source_url } : nil }
  attribute(:claimed) { |hit| hit.event.claimed? }
  attribute(:cadence) { |hit| hit.event.cadence }
  attribute(:stale, &:stale)
  attribute(:last_confirmed_at) { |hit| hit.event.last_confirmed_at&.utc&.iso8601 }

  attribute :sponsors_preview do |hit|
    hit.event.sponsorships.sort_by { |s| [ s.position, s.created_at ] }.first(PREVIEW_SIZE).map do |sponsorship|
      sponsor = sponsorship.sponsor
      { id: sponsor.id, slug: sponsor.slug, name: sponsor.name, logo_url: MediaUrls.attachment(sponsor.logo), role: sponsorship.role }
    end
  end
end
