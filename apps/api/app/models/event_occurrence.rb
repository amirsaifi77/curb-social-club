# One date of an event (docs/data-model.md event_occurrences; events spec
# R-7, R-9). RSVPs, check-ins, and posts attach here, never to events.
# location is copied from the venue and follows it (Venue R-8).
class EventOccurrence < ApplicationRecord
  STATUSES = %w[scheduled cancelled completed].freeze
  OVERRIDE_NOTE_MAX = 280

  belongs_to :event

  before_validation :copy_from_event, on: :create

  validates :starts_at, presence: true, uniqueness: { scope: :event_id }
  validates :ends_at, presence: true
  validates :location, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :override_note, length: { maximum: OVERRIDE_NOTE_MAX }, allow_nil: true
  validate :ends_after_start

  after_save :recount_event, if: -> { previously_new_record? || saved_change_to_status? }
  after_destroy :recount_event

  scope :scheduled, -> { where(status: "scheduled") }
  scope :upcoming, -> { where(starts_at: Time.current..) }
  scope :chronological, -> { order(:starts_at) }

  def scheduled? = status == "scheduled"
  def cancelled? = status == "cancelled"
  def overridden? = overridden_at.present?

  private

  # A bare row takes its end and place from the event so factories, the
  # materializer, and the admin form only need starts_at.
  def copy_from_event
    return if event.nil?

    self.ends_at ||= starts_at + event.duration_minutes.minutes if starts_at && event.duration_minutes
    self.location ||= event.venue&.location
  end

  def ends_after_start
    return if starts_at.blank? || ends_at.blank?

    errors.add(:ends_at, "must be after starts_at") if ends_at <= starts_at
  end

  def recount_event
    return if destroyed_by_association

    event.recount_occurrences!
  end
end

# == Schema Information
#
# Table name: event_occurrences
#
#  id               :uuid             not null, primary key
#  check_in_count   :integer          default(0), not null
#  ends_at          :timestamptz      not null
#  going_count      :integer          default(0), not null
#  interested_count :integer          default(0), not null
#  location         :geography        not null, point, 4326
#  overridden_at    :timestamptz
#  override_note    :text
#  photos_count     :integer          default(0), not null
#  starts_at        :timestamptz      not null
#  status           :text             default("scheduled"), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  event_id         :uuid             not null
#
# Indexes
#
#  index_event_occurrences_on_event_id_and_starts_at  (event_id,starts_at) UNIQUE
#  index_event_occurrences_on_location_and_starts_at  (location,starts_at) USING gist
#  index_event_occurrences_on_starts_at               (starts_at) WHERE (status = 'scheduled'::text)
#
# Foreign Keys
#
#  fk_rails_...  (event_id => events.id)
#
