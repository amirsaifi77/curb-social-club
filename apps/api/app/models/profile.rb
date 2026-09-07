class Profile < ApplicationRecord
  self.primary_key = :user_id

  HANDLE_FORMAT = /\A[a-z0-9_]{3,24}\z/
  VISIBILITIES = %w[public private].freeze

  belongs_to :user

  validates :handle, presence: true,
                     format: { with: HANDLE_FORMAT, message: "must be 3 to 24 lowercase letters, digits, or underscores" },
                     uniqueness: { case_sensitive: false }
  validates :display_name, presence: true, length: { maximum: 80 }
  validates :bio, length: { maximum: 280 }, allow_nil: true
  validates :visibility, inclusion: { in: VISIBILITIES }

  # events spec R-2: a user host renames through display_name.
  after_update :rewrite_host_names, if: :saved_change_to_display_name?

  private

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
