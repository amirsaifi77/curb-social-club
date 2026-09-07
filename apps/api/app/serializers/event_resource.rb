# Event detail (docs/api.md Event): EventSummary plus the fields only the
# detail screen needs. The root object is a Geo::EventHit, so the summary
# half is inherited unchanged; `params[:viewer]` is the signed-in user or
# nil, and every viewer field is false or null when anonymous (R-22).
class EventResource < EventSummaryResource
  UPCOMING_LIMIT = 4

  attribute(:description) { |hit| hit.event.description }
  attribute(:parking_note) { |hit| hit.event.parking_note }
  attribute(:rrule) { |hit| hit.event.rrule }
  attribute(:dtstart) { |hit| hit.event.dtstart&.utc&.iso8601 }
  attribute(:duration_minutes) { |hit| hit.event.duration_minutes }
  attribute(:rsvp_mode) { |hit| hit.event.rsvp_mode }
  attribute(:capacity) { |hit| hit.event.capacity }
  attribute(:status) { |hit| hit.event.status }
  attribute(:visibility) { |hit| hit.event.visibility }
  attribute(:dormant) { |hit| hit.event.dormant? }
  attribute(:external_host_name) { |hit| hit.event.external_host_name }
  attribute(:photos_count) { 0 }
  attribute(:comments_count) { |hit| hit.event.comments_count }
  attribute(:followers_count) { |hit| hit.event.followers_count }

  # Only ever true for the host or an admin; the public gets 410.
  attribute(:hidden) { |hit| hit.event.hidden_at.present? }

  attribute(:venue) { |hit| VenueResource.new(hit.event.venue).to_h }

  # The next four dates, cancelled ones included so the page can say a week
  # is off (R-22).
  attribute :upcoming_occurrences do |hit|
    hit.event.occurrences.upcoming.where(status: %w[scheduled cancelled]).chronological.limit(UPCOMING_LIMIT).map do |occurrence|
      { id: occurrence.id, starts_at: occurrence.starts_at.utc.iso8601, ends_at: occurrence.ends_at.utc.iso8601,
        timezone: hit.event.timezone, going_count: occurrence.going_count, status: occurrence.status,
        override_note: occurrence.override_note }
    end
  end

  # Every sponsorship by position. The hidden-sponsor filter is 1.6.
  attribute :sponsorships do |hit|
    hit.event.sponsorships.sort_by { |sponsorship| [ sponsorship.position, sponsorship.created_at ] }.map do |sponsorship|
      { sponsor: SponsorSummaryResource.new(sponsorship.sponsor).to_h, role: sponsorship.role,
        note: sponsorship.note, position: sponsorship.position }
    end
  end

  attribute :viewer do |hit|
    viewer = params[:viewer]
    policy = EventPolicy.new(viewer, hit.event)
    { following: false, rsvp: nil, can_edit: policy.edit?, can_claim: policy.claim?,
      claim_status: policy.claim_status, reported: false }
  end
end
