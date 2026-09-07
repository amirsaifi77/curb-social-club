# A sponsor attached to an event as a component, whoever hosts it
# (docs/data-model.md event_sponsorships; sponsors spec R-3, R-4). At most
# six per event and one row per sponsor, both checked here with the unique
# index behind the second rule.
class EventSponsorship < ApplicationRecord
  ROLES = %w[presented_by coffee vendor partner].freeze

  belongs_to :event, inverse_of: :sponsorships
  belongs_to :sponsor, inverse_of: :sponsorships

  validates :role, inclusion: { in: ROLES }
  validates :note, length: { maximum: 200 }, allow_nil: true
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :sponsor_id, uniqueness: { scope: :event_id, message: "is already attached to this event" }
  validate :at_most_six_per_event, on: :create

  after_save :recount_sponsor
  after_save :recount_previous_sponsor, if: :saved_change_to_sponsor_id?
  after_destroy :recount_sponsor

  # Omits sponsorships whose sponsor is hidden (sponsors spec R-5).
  scope :with_visible_sponsor, -> { joins(:sponsor).merge(Sponsor.visible) }
  scope :ordered, -> { order(:position, :created_at) }

  private

  # Model-only by design (docs/data-model.md): a count then insert with no
  # database guard, which is fine for admin-written rows.
  def at_most_six_per_event
    return if event.nil? || event.sponsorships.count < Event::MAX_SPONSORSHIPS

    errors.add(:base, "An event can have at most #{Event::MAX_SPONSORSHIPS} sponsorships")
  end

  def recount_sponsor
    return if destroyed_by_association

    sponsor.recount_events!
  end

  def recount_previous_sponsor
    Sponsor.find_by(id: sponsor_id_before_last_save)&.recount_events!
  end
end

# == Schema Information
#
# Table name: event_sponsorships
#
#  id         :uuid             not null, primary key
#  note       :text
#  position   :integer          default(0), not null
#  role       :text             not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  event_id   :uuid             not null
#  sponsor_id :uuid             not null
#
# Indexes
#
#  index_event_sponsorships_on_event_id_and_sponsor_id  (event_id,sponsor_id) UNIQUE
#  index_event_sponsorships_on_sponsor_id               (sponsor_id)
#
# Foreign Keys
#
#  fk_rails_...  (event_id => events.id)
#  fk_rails_...  (sponsor_id => sponsors.id)
#
