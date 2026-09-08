module Seeds
  # venues.csv (docs/specs/admin.md Data), optional because event rows
  # carry their venue columns. Natural key is the normalized name within
  # 100 m, which is Venues::Deduper's rule (events spec R-6).
  class VenueRowImporter < BaseImporter
    # A venue has no single-column natural key: two rows naming one lot are
    # collapsed by the deduper at write time instead.
    UNIQUE_COLUMNS = [].freeze
    REQUIRED = %i[name city region country lat lng].freeze

    Plan = Data.define(:row_number, :name, :attributes, :existing)

    private

    def key_for(row) = value(row, :name) || "(no name)"

    def plan(row, number)
      name = value(row, :name)
      errors = required(row, REQUIRED)
      point = Geo::Coordinates.point(value(row, :lat), value(row, :lng))
      errors << "lat and lng must be a real coordinate pair." if point.nil? && errors.empty?
      return report.add(number: number, key: name.presence || "(no name)", action: "error", errors: errors) if errors.any?

      existing = Venues::Deduper.find_match(name, point)
      # A match means the same lot, and the two names are equal once
      # normalized, so the stored spelling stays. Rewriting it would make a
      # file with two spellings flip the row on every run. The point does
      # move, because correcting a lat and lng is what the file is for.
      attributes = venue_attributes(row).merge(location: point)
      attributes = attributes.except(:name) if existing
      record = existing || Venue.new(created_by: User.app_account)
      record.assign_attributes(attributes)
      return report.add(number: number, key: name, action: "error", errors: record.errors.full_messages) unless record.valid?

      action = existing.nil? ? "create" : (record.changed? ? "update" : "skip")
      # The candidate was the existing row itself, so the trial assignment
      # is undone: apply decides for itself what to write, and for a
      # collapsed row that is deliberately less than the plan assigned.
      record.restore_attributes if existing
      report.add(number: number, key: name, action: action)
      # A row that writes nothing still owns its lot for the rest of this
      # run, so a later row naming the same lot does not move the point the
      # first row already agrees with.
      return claimed_ids << existing.id if action == "skip"

      Plan.new(row_number: number, name: name, attributes: attributes, existing: existing)
    end

    # The deduper runs again at write time, because a row earlier in the
    # same file may have created or claimed the lot this row names (R-6).
    # The first row in the file to reach a lot owns its name and point;
    # later rows contribute their other columns only, so a file with two
    # spellings or two slightly different points settles instead of moving
    # the lot back and forth on every run. A row that is the only one for
    # its lot does move the point, which is how a wrong lat and lng is
    # corrected.
    def apply(plan)
      record = plan.existing || Venues::Deduper.find_match(plan.name, plan.attributes[:location])
      claimed = record && claimed_ids.include?(record.id)
      attributes = claimed ? plan.attributes.except(:name, :location) : plan.attributes

      record ||= Venue.new(created_by: User.app_account)
      record.assign_attributes(attributes)
      changed = record.changed?
      record.save!
      claimed_ids << record.id

      # Only a row that turned out to share a lot needs correcting; a plain
      # create or a plain match already said what it did.
      return unless claimed

      report.revise(plan.row_number, action: changed ? "update" : "skip",
                    notes: [ "same lot as an earlier row in this file." ])
    end

    def claimed_ids = @claimed_ids ||= Set.new

    def venue_attributes(row)
      { name: value(row, :name), address_line1: value(row, :address_line1), address_line2: value(row, :address_line2),
        city: value(row, :city), region: value(row, :region), postal_code: value(row, :postal_code),
        country: value(row, :country)&.upcase, timezone: value(row, :timezone) || Venue::DEFAULT_TIMEZONE,
        external_place_id: value(row, :external_place_id),
        external_source: value(row, :external_source) || "manual" }.compact
    end
  end
end
