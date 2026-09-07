# A brand, vendor, or venue business (docs/data-model.md sponsors; sponsors
# spec R-1 to R-5). Hosts events like a club and can also be attached to
# any event through event_sponsorships. Admin-managed until self-service.
class Sponsor < ApplicationRecord
  SLUG_FORMAT = /\A[a-z0-9-]{3,40}\z/
  KINDS = %w[brand vendor venue].freeze
  STATUSES = %w[active hidden].freeze
  URL_FORMAT = %r{\Ahttps?://[^\s]+\z}

  has_many :events, as: :host, dependent: :restrict_with_error
  has_many :sponsorships, class_name: "EventSponsorship", dependent: :destroy, inverse_of: :sponsor
  has_many :sponsored_events, through: :sponsorships, source: :event
  has_one_attached :logo
  has_one_attached :banner

  before_validation :generate_slug, on: :create

  validates :name, presence: true, length: { maximum: 80 }
  validates :slug, presence: true,
                   format: { with: SLUG_FORMAT, message: "must be 3 to 40 lowercase letters, digits, or hyphens" },
                   uniqueness: { case_sensitive: false }
  validates :kind, inclusion: { in: KINDS }
  validates :tagline, length: { maximum: 80 }, allow_nil: true
  validates :description, length: { maximum: 1000 }, allow_nil: true
  validates :website, format: { with: URL_FORMAT, message: "must start with http:// or https://" }, allow_blank: true
  validates :home_label, length: { maximum: 80 }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }

  # R-2: every hosted event carries the new name.
  after_update :rewrite_host_names, if: :saved_change_to_name?

  scope :visible, -> { where(status: "active") }

  def hidden? = status == "hidden"

  # R-4: published events hosted plus published events attached, each once.
  def recount_events!
    hosted = Event.published.where(host_type: "Sponsor", host_id: id)
    attached = Event.published.where(id: sponsorships.select(:event_id))
    update_columns(events_count: hosted.or(attached).count)
  end

  private

  def generate_slug
    self.slug = name.to_s.parameterize.first(40).sub(/-+\z/, "") if slug.blank?
  end

  def rewrite_host_names
    events.update_all(host_name: name, updated_at: Time.current)
  end
end

# == Schema Information
#
# Table name: sponsors
#
#  id              :uuid             not null, primary key
#  description     :text
#  events_count    :integer          default(0), not null
#  followers_count :integer          default(0), not null
#  home_label      :text
#  home_location   :geography        point, 4326
#  kind            :text             not null
#  links           :jsonb            not null
#  name            :text             not null
#  slug            :citext           not null
#  status          :text             default("active"), not null
#  tagline         :text
#  verified        :boolean          default(FALSE), not null
#  website         :text
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#
# Indexes
#
#  index_sponsors_on_home_location  (home_location) USING gist
#  index_sponsors_on_name           (name) USING gin
#  index_sponsors_on_slug           (slug) UNIQUE
#
