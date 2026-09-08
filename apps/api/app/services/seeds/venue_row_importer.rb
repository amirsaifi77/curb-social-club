module Seeds
  # venues.csv (docs/specs/admin.md Data), optional because event rows
  # carry their venue columns. Natural key is the normalized name within
  # 100 m, which is Venues::Deduper's rule (events spec R-6).
  class VenueRowImporter < BaseImporter
    REQUIRED = %i[name city region country lat lng].freeze

    Plan = Data.define(:row_number, :name, :attributes, :existing)

    private

    def plan(row, number)
      name = value(row, :name)
      errors = required(row, REQUIRED)
      point = Geo::Coordinates.point(value(row, :lat), value(row, :lng))
      errors << "lat and lng must be a real coordinate pair." if point.nil? && errors.empty?
      return report.add(number: number, key: name.presence || "(no name)", action: "error", errors: errors) if errors.any?

      existing = Venues::Deduper.find_match(name, point)
      # A match means the same lot, and the two names are equal once
      # normalized, so the stored spelling stays. Rewriting it would make a
      # file with two spellings flip the row on every run.
      attributes = venue_attributes(row)
      attributes = attributes.except(:name) if existing
      record = existing || Venue.new(created_by: User.app_account, location: point)
      record.assign_attributes(attributes)
      return report.add(number: number, key: name, action: "error", errors: record.errors.full_messages) unless record.valid?

      action = existing.nil? ? "create" : (record.changed? ? "update" : "skip")
      report.add(number: number, key: name, action: action)
      return nil if action == "skip"

      Plan.new(row_number: number, name: name, attributes: attributes.merge(location: point), existing: existing)
    end

    # The deduper runs again at write time, because a row earlier in the
    # same file may have created the lot this row names (events R-6).
    def apply(plan)
      record = plan.existing || Venues::Deduper.find_match(plan.name, plan.attributes[:location])
      if record && plan.existing.nil?
        report.revise(plan.row_number, action: "skip", notes: [ "same lot as an earlier row in this file." ])
        return
      end

      record ||= Venue.new(created_by: User.app_account)
      record.assign_attributes(plan.attributes)
      record.save!
    end

    def venue_attributes(row)
      { name: value(row, :name), address_line1: value(row, :address_line1), address_line2: value(row, :address_line2),
        city: value(row, :city), region: value(row, :region), postal_code: value(row, :postal_code),
        country: value(row, :country)&.upcase, timezone: value(row, :timezone) || Venue::DEFAULT_TIMEZONE,
        external_place_id: value(row, :external_place_id),
        external_source: value(row, :external_source) || "manual" }.compact
    end
  end
end
