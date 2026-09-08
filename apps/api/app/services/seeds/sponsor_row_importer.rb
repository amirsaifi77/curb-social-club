module Seeds
  # sponsors.csv (docs/specs/admin.md Data). Natural key `slug`.
  class SponsorRowImporter < BaseImporter
    UNIQUE_COLUMNS = %i[slug].freeze
    REQUIRED = %i[slug name kind].freeze

    Plan = Data.define(:row_number, :slug, :attributes, :existing)

    private

    def plan(row, number)
      slug = value(row, :slug).to_s.downcase
      errors = required(row, REQUIRED)
      return report.add(number: number, key: slug.presence || "(no slug)", action: "error", errors: errors) if errors.any?

      existing = Sponsor.find_by(slug: slug)
      attributes = sponsor_attributes(row, existing)
      record = existing || Sponsor.new(slug: slug)
      record.assign_attributes(attributes)
      return report.add(number: number, key: slug, action: "error", errors: record.errors.full_messages) unless record.valid?

      action = existing.nil? ? "create" : (record.changed? ? "update" : "skip")
      record.restore_attributes if existing
      report.add(number: number, key: slug, action: action)
      return nil if action == "skip"

      Plan.new(row_number: number, slug: slug, attributes: attributes, existing: existing)
    end

    def apply(plan)
      record = plan.existing || Sponsor.new(slug: plan.slug)
      record.assign_attributes(plan.attributes)
      record.save!
    end

    def sponsor_attributes(row, existing)
      attributes = {
        name: value(row, :name), kind: value(row, :kind), tagline: value(row, :tagline),
        description: value(row, :description), website: value(row, :website),
        home_label: value(row, :home_label), verified: flag(row, :verified)
      }.compact
      attributes[:links] = links_from(row) if links_from(row).present? || existing.nil?
      point = Geo::Coordinates.point(value(row, :home_lat), value(row, :home_lng))
      attributes[:home_location] = point if point
      attributes
    end

    def links_from(row)
      SocialLinks::LINK_KEYS.index_with { |key| value(row, key.to_sym) }.compact
    end

    def flag(row, key)
      text = value(row, key)
      return nil if text.nil?

      %w[1 true yes y].include?(text.downcase)
    end
  end
end
