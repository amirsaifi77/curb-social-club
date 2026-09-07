# One row per admin write (docs/specs/admin.md R-1, docs/data-model.md).
# `changeset` holds before and after values, or whatever the action found
# worth keeping; long strings are cut at 2,000 chars and blobs never enter.
class AdminAudit < ApplicationRecord
  MAX_VALUE_LENGTH = 2_000

  belongs_to :admin, class_name: "User", optional: true

  validates :action, presence: true

  scope :recent, -> { order(created_at: :desc) }

  def self.record(admin:, action:, target: nil, changes: {}, ip: nil)
    create!(
      admin: admin,
      action: action,
      target_type: target&.class&.name,
      target_id: target&.id,
      changeset: truncate(changes),
      ip: ip
    )
  end

  def self.truncate(value)
    case value
    when Hash then value.to_h { |k, v| [ k.to_s, truncate(v) ] }
    when Array then value.map { |v| truncate(v) }
    when String then value.truncate(MAX_VALUE_LENGTH)
    when ActiveStorage::Blob, ActiveStorage::Attached then "[blob]"
    else value
    end
  end
end

# == Schema Information
#
# Table name: admin_audits
#
#  id          :uuid             not null, primary key
#  action      :text             not null
#  changeset   :jsonb            not null
#  ip          :inet
#  target_type :text
#  created_at  :datetime         not null
#  admin_id    :uuid
#  target_id   :uuid
#
# Indexes
#
#  index_admin_audits_on_admin_id_and_created_at                   (admin_id,created_at DESC)
#  index_admin_audits_on_target_type_and_target_id_and_created_at  (target_type,target_id,created_at DESC)
#
# Foreign Keys
#
#  fk_rails_...  (admin_id => users.id) ON DELETE => nullify
#
