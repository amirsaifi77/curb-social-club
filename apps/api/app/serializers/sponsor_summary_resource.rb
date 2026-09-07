# SponsorSummary (docs/api.md).
class SponsorSummaryResource
  include Alba::Resource

  attributes :id, :slug, :name, :kind, :verified, :tagline, :followers_count, :home_label

  attribute(:logo_url) { |sponsor| MediaUrls.attachment(sponsor.logo) }
end
