class DeviceResource
  include Alba::Resource

  attributes :anonymous_id, :platform, :push_enabled, :app_version, :timezone, :user_id, :last_seen_at

  attribute(:push_token_present) { |device| device.push_token.present? }

  attribute :home_location do |device|
    point = device.home_location
    point && { lat: point.y.round(2), lng: point.x.round(2) }
  end
end
