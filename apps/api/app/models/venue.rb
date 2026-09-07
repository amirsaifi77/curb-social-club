# A place events happen (docs/data-model.md venues; events spec R-6, R-8).
# location is geography(Point,4326) and every distance query stays in
# PostGIS. Moving a venue moves the future scheduled occurrences of its
# events in the same transaction (after_save runs inside it).
class Venue < ApplicationRecord
  EXTERNAL_SOURCES = %w[apple google manual].freeze
  COUNTRY_FORMAT = /\A[A-Z]{2}\z/
  DEFAULT_TIMEZONE = "America/Los_Angeles"

  belongs_to :created_by, class_name: "User"
  has_many :events, dependent: :restrict_with_error

  validates :name, presence: true, length: { maximum: 120 }
  validates :country, format: { with: COUNTRY_FORMAT, message: "must be an ISO 3166-1 alpha-2 code" }
  validates :location, presence: true
  validates :timezone, presence: true
  validates :external_source, inclusion: { in: EXTERNAL_SOURCES }
  validate :timezone_is_iana

  after_save :move_scheduled_occurrences, if: :saved_change_to_location?

  # Lowercased, whitespace collapsed; the key Venues::Deduper (1.5) matches on.
  def self.normalize_name(name)
    name.to_s.downcase.split.join(" ")
  end

  private

  def timezone_is_iana
    return if timezone.blank?

    errors.add(:timezone, "must be an IANA zone name") unless Geo.iana_timezone?(timezone)
  end

  # R-8: every scheduled occurrence still ahead of now follows the venue.
  def move_scheduled_occurrences
    EventOccurrence.scheduled.upcoming.where(event_id: events.select(:id)).update_all(location: location)
  end
end

# == Schema Information
#
# Table name: venues
#
#  id                :uuid             not null, primary key
#  address_line1     :text
#  address_line2     :text
#  city              :text
#  country           :text             not null
#  external_source   :text             default("manual"), not null
#  location          :geography        not null, point, 4326
#  name              :text             not null
#  postal_code       :text
#  region            :text
#  timezone          :text             default("America/Los_Angeles"), not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  created_by_id     :uuid             not null
#  external_place_id :text
#
# Indexes
#
#  index_venues_on_created_by_id                          (created_by_id)
#  index_venues_on_external_source_and_external_place_id  (external_source,external_place_id)
#  index_venues_on_location                               (location) USING gist
#
# Foreign Keys
#
#  fk_rails_...  (created_by_id => users.id)
#
