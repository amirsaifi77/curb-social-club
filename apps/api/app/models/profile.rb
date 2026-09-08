class Profile < ApplicationRecord
  self.primary_key = :user_id

  HANDLE_FORMAT = /\A[a-z0-9_]{3,24}\z/
  VISIBILITIES = %w[public private].freeze
  # R-2: the only social keys, each with the platform's own handle rule.
  LINK_FORMATS = {
    "instagram" => /\A[A-Za-z0-9._]{1,30}\z/,
    "threads" => /\A[A-Za-z0-9._]{1,30}\z/,
    "tiktok" => /\A[A-Za-z0-9._]{1,24}\z/,
    "x" => /\A[A-Za-z0-9_]{1,15}\z/,
    "youtube" => /\A[A-Za-z0-9._-]{3,30}\z/,
    "website" => %r{\Ahttps?://[^\s/]+\.[^\s]*\z}
  }.freeze
  LINK_KEYS = LINK_FORMATS.keys.freeze
  WEBSITE_MAX = 200
  DISPLAY_NAME_MAX = 40
  # R-3: browse coordinates are coarse on purpose (location privacy).
  HOME_LOCATION_PRECISION = 2

  belongs_to :user

  # Set only by db/seeds.rb (and the :app_account factory) so the seeded
  # system account may take the reserved handle "curb"; R-1 reserves it
  # against everyone else.
  attr_accessor :system_account

  validates :handle, presence: true,
                     format: { with: HANDLE_FORMAT, message: "must be 3 to 24 lowercase letters, digits, or underscores" },
                     uniqueness: { case_sensitive: false }
  validates :display_name, presence: true, length: { in: 1..DISPLAY_NAME_MAX }
  validates :bio, length: { maximum: 280 }, allow_nil: true
  validates :home_label, length: { maximum: 60 }, allow_nil: true
  validates :visibility, inclusion: { in: VISIBILITIES }
  validate :handle_not_reserved, unless: :system_account?
  validate :links_allowed

  before_validation :normalize_handle
  before_validation :normalize_links
  before_validation :round_home_location

  # events spec R-2: a user host renames through display_name.
  after_update :rewrite_host_names, if: :saved_change_to_display_name?

  def self.reserved_handles = Rails.configuration.x.reserved_handles

  private

  def normalize_handle
    self.handle = handle.to_s.strip.downcase if handle.present?
  end

  # R-2: a leading @ and stray whitespace are stripped before validating,
  # and a blank value drops the key rather than storing an empty string.
  def normalize_links
    return unless links.is_a?(Hash)

    self.links = links.each_with_object({}) do |(key, value), kept|
      text = value.to_s.strip.delete_prefix("@")
      kept[key.to_s] = text if text.present?
    end
  end

  def round_home_location
    return if home_location.blank?

    self.home_location = Geo.point(home_location.y.round(HOME_LOCATION_PRECISION),
                                   home_location.x.round(HOME_LOCATION_PRECISION))
  end

  # The seeded app account holds a reserved handle for good, so a later
  # save of that row (admin user editing in 1.9) must not trip the rule.
  def system_account?
    system_account || (persisted? && self.class.reserved_handles.include?(handle_was))
  end

  def handle_not_reserved
    errors.add(:handle, :reserved, message: "is reserved") if self.class.reserved_handles.include?(handle)
  end

  def links_allowed
    return unless links.is_a?(Hash)

    links.each do |key, value|
      format = LINK_FORMATS[key.to_s]
      next errors.add(:links, "#{key} is not a supported link") if format.nil?
      next errors.add(:links, "#{key} is too long") if key.to_s == "website" && value.to_s.length > WEBSITE_MAX

      errors.add(:links, "#{key} is invalid") unless value.to_s.match?(format)
    end
  end

  def rewrite_host_names
    Event.where(host_type: "User", host_id: user_id).update_all(host_name: display_name, updated_at: Time.current)
  end
end

# == Schema Information
#
# Table name: profiles
#
#  bio                :text
#  display_name       :text             not null
#  followers_count    :integer          default(0), not null
#  following_count    :integer          default(0), not null
#  handle             :citext           not null
#  home_label         :text
#  home_location      :geography        point, 4326
#  is_host            :boolean          default(FALSE), not null
#  links              :jsonb            not null
#  notification_prefs :jsonb            not null
#  visibility         :text             default("public"), not null
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  user_id            :uuid             not null, primary key
#
# Indexes
#
#  index_profiles_on_handle   (handle) UNIQUE
#  index_profiles_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
