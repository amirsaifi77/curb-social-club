# The `links` jsonb that profiles, clubs, and sponsors share
# (docs/data-model.md: "Same shape as profiles.links", validated on write).
# Six keys, handles without the @ except `website`, which is a URL. A blank
# value drops its key rather than storing an empty string.
module SocialLinks
  extend ActiveSupport::Concern

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

  included do
    before_validation :normalize_links
    validate :links_allowed
  end

  private

  def normalize_links
    return unless links.is_a?(Hash)

    self.links = links.each_with_object({}) do |(key, value), kept|
      text = value.to_s.strip.delete_prefix("@")
      kept[key.to_s] = text if text.present?
    end
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
end
