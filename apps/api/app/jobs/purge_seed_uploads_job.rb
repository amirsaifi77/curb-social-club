# Nightly (config/recurring.yml): seed CSV uploads are working files, not
# records, so A07's blobs go after a day rather than accumulating in R2
# (docs/specs/admin.md Risks).
class PurgeSeedUploadsJob < ApplicationJob
  KEEP_FOR = 24.hours
  # active_storage_blobs.metadata is a text column holding JSON, so this
  # matches the serialized pair rather than casting, which would raise on
  # any row whose metadata is not valid JSON.
  MARKER = '%"seed_upload":true%'.freeze

  queue_as :default

  def self.uploads = ActiveStorage::Blob.where("metadata LIKE ?", MARKER)

  def perform(now: Time.current)
    self.class.uploads.where(created_at: ...(now - KEEP_FOR)).find_each do |blob|
      # Attached to something after all (nothing attaches these today, but
      # a purge that deletes a referenced file is not recoverable).
      next blob.update_columns(metadata: blob.metadata.except("seed_upload").to_json) if blob.attachments.exists?

      blob.purge_later
    end
  end
end
