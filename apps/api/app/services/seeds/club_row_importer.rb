module Seeds
  # clubs.csv (docs/specs/admin.md Data). Natural key `slug`; a blank
  # `owner_handle` means the app account, so a seeded club always has the
  # one owner clubs R-3 requires.
  class ClubRowImporter < BaseImporter
    UNIQUE_COLUMNS = %i[slug].freeze
    REQUIRED = %i[slug name].freeze

    Plan = Data.define(:row_number, :slug, :attributes, :owner, :existing)

    private

    def plan(row, number)
      slug = value(row, :slug).to_s.downcase
      errors = required(row, REQUIRED)
      owner, owner_error = resolve_owner(row, number)
      errors << owner_error if owner_error
      return report.add(number: number, key: slug.presence || "(no slug)", action: "error", errors: errors) if errors.any?

      existing = Club.find_by(slug: slug)
      attributes = club_attributes(row, existing)
      record = existing || Club.new(slug: slug, created_by: owner)
      record.assign_attributes(attributes)
      return report.add(number: number, key: slug, action: "error", errors: record.errors.full_messages) unless record.valid?

      action = existing.nil? ? "create" : (record.changed? ? "update" : "skip")
      record.restore_attributes if existing
      report.add(number: number, key: slug, action: action)
      return nil if action == "skip"

      Plan.new(row_number: number, slug: slug, attributes: attributes, owner: owner, existing: existing)
    end

    def apply(plan)
      club = plan.existing || Club.new(slug: plan.slug, created_by: plan.owner)
      club.assign_attributes(plan.attributes)
      club.save!
      club.memberships.create!(user: plan.owner, role: "owner", status: "active") if club.owner.nil?
    end

    def resolve_owner(row, _number)
      handle = value(row, :owner_handle)
      return [ User.app_account, ("no app account: run db/seeds.rb first" if User.app_account.nil?) ] if handle.blank?

      user = Admin::HandleLookup.call(handle)
      [ user, ("no user with handle #{handle}." if user.nil?) ]
    end

    # Blank cells leave existing values alone on update and take the model
    # default on create (events spec Data).
    def club_attributes(row, existing)
      attributes = {
        name: value(row, :name), description: value(row, :description), home_label: value(row, :home_label),
        join_policy: value(row, :join_policy), verified: flag(row, :verified)
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
