module Seeds
  # events.csv (events spec R-29, R-30, R-28, Data). Every row is validated
  # before any is written; a row upserts on `slug`; the venue goes through
  # Venues::Deduper so two rows naming the same lot share one venue (R-6);
  # `verified_date` sets `verified_at` and moves `last_confirmed_at` only
  # forward (R-28); and a claimed event keeps its host and `claimed_at`,
  # with the skip named in the row's notes (R-29).
  class EventRowImporter < BaseImporter
    REQUIRED = %i[slug title cadence duration_minutes].freeze
    VENUE_REQUIRED = %i[venue_name venue_city venue_region venue_country venue_lat venue_lng].freeze
    HOST_TYPES = { "user" => "User", "club" => "Club", "sponsor" => "Sponsor" }.freeze
    MISSING_VERIFICATION = "verification_source_url and verified_date are required.".freeze
    BAD_RRULE = Recurrence::RruleValidator::MESSAGE
    CLAIMED_NOTE = "claimed: host and claimed_at left alone.".freeze

    Plan = Data.define(:row_number, :slug, :attributes, :venue, :sponsorships, :existing)

    private

    def plan(row, number)
      slug = value(row, :slug).to_s.downcase
      errors = row_errors(row)
      return report.add(number: number, key: slug.presence || "(no slug)", action: "error", errors: errors) if errors.any?

      existing = Event.find_by(slug: slug)
      venue = venue_for(row)
      host, host_error = resolve_host(row)
      return report.add(number: number, key: slug, action: "error", errors: [ host_error ]) if host_error

      notes = []
      attributes = event_attributes(row, venue, host, existing, notes)
      record = candidate(existing, slug, venue, attributes)
      return report.add(number: number, key: slug, action: "error", errors: record.errors.full_messages) unless record.valid?

      action = existing.nil? ? "create" : (record.changed? ? "update" : "skip")
      report.add(number: number, key: slug, action: action, notes: notes)
      return nil if action == "skip" && sponsorship_rows(row).blank?

      Plan.new(row_number: number, slug: slug, attributes: attributes, venue: venue,
               sponsorships: sponsorship_rows(row), existing: existing)
    end

    def apply(plan)
      venue = Venues::Deduper.find_or_create(plan.venue) if plan.venue
      event = plan.existing || Event.new(slug: plan.slug, created_by: User.app_account)
      event.venue = venue if venue
      event.assign_attributes(plan.attributes)
      event.save!
      write_sponsorships(event, plan.sponsorships)
    end

    # Validation the CSV owns, before the model gets a say.
    def row_errors(row)
      errors = required(row, REQUIRED)
      errors << MISSING_VERIFICATION if value(row, :verification_source_url).blank? || value(row, :verified_date).blank?
      errors.concat(required(row, VENUE_REQUIRED))
      errors << "venue_lat and venue_lng must be a real coordinate pair." if venue_point(row).nil? && errors.empty?
      errors << "verified_date must be YYYY-MM-DD and not in the future." if verified_date_error?(row)
      errors << BAD_RRULE if value(row, :rrule).present? && Recurrence::RruleValidator.parse(value(row, :rrule)).nil?
      errors.concat(sponsorship_errors(row))
      errors
    end

    def verified_date_error?(row)
      text = value(row, :verified_date)
      return false if text.blank?

      Date.iso8601(text) > now.to_date
    rescue Date::Error
      true
    end

    def venue_point(row)
      Geo::Coordinates.point(value(row, :venue_lat), value(row, :venue_lng))
    end

    def venue_for(row)
      point = venue_point(row)
      return nil if point.nil?

      { name: value(row, :venue_name), address_line1: value(row, :venue_address_line1),
        address_line2: value(row, :venue_address_line2), city: value(row, :venue_city),
        region: value(row, :venue_region), postal_code: value(row, :venue_postal_code),
        country: value(row, :venue_country)&.upcase, external_place_id: value(row, :venue_external_place_id),
        timezone: value(row, :venue_timezone) || Venue::DEFAULT_TIMEZONE,
        created_by: User.app_account, location: point }.compact
    end

    # Blank host_slug means the app account as a User (R-29).
    def resolve_host(row)
      type = value(row, :host_type)&.downcase
      slug = value(row, :host_slug)
      return [ User.app_account, nil ] if type.blank? && slug.blank?

      model = HOST_TYPES[type.to_s]
      return [ nil, "host_type must be user, club, or sponsor." ] if model.nil?

      host = lookup_host(model, slug)
      [ host, ("no #{type} with slug #{slug}." if host.nil?) ]
    end

    def lookup_host(model, slug)
      model == "User" ? Admin::HandleLookup.call(slug) : model.constantize.find_by(slug: slug.to_s.downcase)
    end

    def candidate(existing, slug, venue, attributes)
      record = existing || Event.new(slug: slug, created_by: User.app_account)
      # The venue is not written on a dry run, so validation borrows an
      # in-memory one with the same timezone and point.
      record.venue ||= Venue.new(venue.merge(created_by: User.app_account)) if venue
      record.assign_attributes(attributes)
      record
    end

    def event_attributes(row, venue, host, existing, notes)
      zone = venue ? venue[:timezone] : (existing&.timezone || Venue::DEFAULT_TIMEZONE)
      attributes = {
        title: value(row, :title), description: value(row, :description), cadence: value(row, :cadence),
        duration_minutes: value(row, :duration_minutes)&.to_i, timezone: zone,
        rrule: value(row, :rrule), tags: tags_from(row, existing),
        rsvp_mode: value(row, :rsvp_mode), visibility: value(row, :visibility),
        status: value(row, :status) || (existing ? nil : "published"),
        source_url: value(row, :source_url), source_type: value(row, :source_type),
        external_host_name: value(row, :external_host_name),
        verification_source_url: value(row, :verification_source_url)
      }.compact
      attributes[:dtstart] = local_time(value(row, :dtstart_local), zone) if value(row, :dtstart_local)
      attributes[:rrule_until] = end_of_day(value(row, :rrule_until), zone) if value(row, :rrule_until)
      attributes.merge!(confirmation(row, existing))
      attributes.merge!(host_attributes(host, existing, notes))
      attributes
    end

    # R-28: verified_at follows verified_date; last_confirmed_at only ever
    # moves forward, so re-running an older file cannot age a meet back
    # into staleness.
    def confirmation(row, existing)
      verified = Date.iso8601(value(row, :verified_date)).in_time_zone(Venue::DEFAULT_TIMEZONE).noon
      attributes = { verified_at: verified }
      current = existing&.last_confirmed_at
      attributes[:last_confirmed_at] = verified if current.nil? || verified > current
      attributes
    end

    # R-29: a claimed event's host belongs to whoever claimed it.
    def host_attributes(host, existing, notes)
      if existing&.claimed?
        notes << CLAIMED_NOTE
        return {}
      end
      return {} if host.nil?

      { host_type: host.class.name, host_id: host.id }
    end

    def tags_from(row, existing)
      tags = pipe_list(row, :tags)
      return tags if tags.any?

      existing ? nil : [ "all" ]
    end

    def local_time(text, zone)
      ActiveSupport::TimeZone[zone]&.parse(text.to_s)
    end

    def end_of_day(text, zone)
      ActiveSupport::TimeZone[zone]&.parse(text.to_s)&.end_of_day
    end

    def sponsorship_rows(row)
      pipe_list(row, :sponsors).filter_map do |pair|
        slug, role = pair.split(":", 2).map { |part| part.to_s.strip }
        { slug: slug.downcase, role: role.presence || "partner" }
      end
    end

    def sponsorship_errors(row)
      sponsorship_rows(row).flat_map do |entry|
        [ ("no sponsor with slug #{entry[:slug]}." unless Sponsor.exists?(slug: entry[:slug])),
          ("sponsor role must be one of #{EventSponsorship::ROLES.join(', ')}." unless EventSponsorship::ROLES.include?(entry[:role])) ].compact
      end
    end

    # The file is the truth for a row's sponsors: what it names is what the
    # event ends up with, so removing a sponsor from the file removes it.
    def write_sponsorships(event, entries)
      wanted = entries.map { |entry| [ Sponsor.find_by(slug: entry[:slug])&.id, entry[:role] ] }.reject { |id, _| id.nil? }
      event.sponsorships.where.not(sponsor_id: wanted.map(&:first)).destroy_all
      wanted.each_with_index do |(sponsor_id, role), index|
        sponsorship = event.sponsorships.find_or_initialize_by(sponsor_id: sponsor_id)
        sponsorship.update!(role: role, position: index)
      end
    end
  end
end
