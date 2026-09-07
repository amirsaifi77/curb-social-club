# The one Host shape for User, Club, and Sponsor (docs/api.md Host, ADR
# 0010): clients switch on type only for the link target. A user host has
# no avatar until Phase 2 and is never verified.
class HostResource
  include Alba::Resource

  attribute(:type) { |host| host.class.name.downcase }
  attribute(:id, &:id)
  attribute(:slug) { |host| host.is_a?(User) ? host.profile&.handle : host.slug }
  attribute(:name) { |host| host.is_a?(User) ? host.profile&.display_name : host.name }

  attribute :avatar_url do |host|
    case host
    when Club then MediaUrls.attachment(host.avatar)
    when Sponsor then MediaUrls.attachment(host.logo)
    end
  end

  attribute(:verified) { |host| host.is_a?(User) ? false : host.verified }
  attribute(:kind) { |host| host.is_a?(Sponsor) ? host.kind : nil }
end
