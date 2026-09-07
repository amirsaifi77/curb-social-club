module Api
  module V1
    class DevicesController < ApplicationController
      # POST /v1/devices: upsert on anonymous_id (R-18)
      def create
        attrs = device_params(:anonymous_id, :platform, :push_token, :app_version, :timezone)
        device = Device.find_or_initialize_by(anonymous_id: attrs.delete(:anonymous_id).to_s.downcase)
        created = device.new_record?
        device.assign_attributes(attrs.merge(home_location: home_location_param, last_seen_at: Time.current).compact)
        device.save!
        render_data DeviceResource.new(device).to_h, status: created ? :created : :ok
      end

      # PATCH /v1/devices/:anonymous_id: push_token, push_enabled, app_version,
      # home_location, timezone only; user_id in the body is ignored.
      def update
        device = Device.find_by!(anonymous_id: params[:anonymous_id].to_s.downcase)
        attrs = device_params(:push_token, :push_enabled, :app_version, :timezone)
        attrs[:home_location] = home_location_param if params.key?(:home_location)
        device.update!(attrs.merge(last_seen_at: Time.current))
        render_data DeviceResource.new(device).to_h
      end

      private

      def device_params(*keys)
        params.permit(*keys).to_h.symbolize_keys
      end

      # { lat, lng } objects, never arrays (docs/api.md Conventions).
      def home_location_param
        loc = params[:home_location]
        return nil unless loc.respond_to?(:[]) && loc[:lat].present? && loc[:lng].present?

        "POINT(#{loc[:lng].to_f} #{loc[:lat].to_f})"
      end
    end
  end
end
