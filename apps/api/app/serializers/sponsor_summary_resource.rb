# SponsorSummary (docs/api.md).
class SponsorSummaryResource
  include Alba::Resource

  attributes :id, :slug, :name, :kind, :verified, :tagline, :followers_count, :home_label

  attribute(:logo_url) { |sponsor| MediaUrls.attachment(sponsor.logo) }
  # Present only when the row came from a `near` query (R-7).
  attribute(:distance_m) { |sponsor| sponsor.has_attribute?(:distance_m) ? sponsor[:distance_m] : nil }
end
