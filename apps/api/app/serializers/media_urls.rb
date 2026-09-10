# URLs for Active Storage attachments in API payloads. Inside a request the
# URL is absolute on the request's own host (Api::V1::ApplicationController
# includes ActiveStorage::SetCurrent), because the clients live on other
# origins: the simulator and the web app cannot resolve a bare path against
# the API. Outside a request there is no host to use, so it stays a path.
# The media host arrives with uploads (Phase 4) and replaces the request
# host here, in one place.
module MediaUrls
  def self.attachment(attachment)
    return nil unless attachment&.attached?

    options = ActiveStorage::Current.url_options
    if options.present?
      Rails.application.routes.url_helpers.rails_blob_url(attachment, **options)
    else
      Rails.application.routes.url_helpers.rails_blob_path(attachment, only_path: true)
    end
  end
end
