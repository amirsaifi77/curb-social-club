# Paths for Active Storage attachments in API payloads. Relative paths for
# now; the media host arrives with uploads (Phase 4) and turns these into
# absolute URLs in one place.
module MediaUrls
  def self.attachment(attachment)
    return nil unless attachment&.attached?

    Rails.application.routes.url_helpers.rails_blob_path(attachment, only_path: true)
  end
end
