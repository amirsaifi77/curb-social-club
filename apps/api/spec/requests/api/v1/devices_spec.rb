require "swagger_helper"

RSpec.describe "v1/devices" do
  let(:anonymous_id) { SecureRandom.uuid }

  path "/v1/devices" do
    post "Register or update a device" do
      description "Upserts on anonymous_id so push registration and the home area survive until sign-in."
      tags "Devices"
      consumes "application/json"
      produces "application/json"
      parameter name: :body, in: :body, required: true, schema: {
        type: :object,
        properties: {
          anonymous_id: { type: :string, format: :uuid },
          platform: { type: :string, enum: %w[ios android web] },
          push_token: { type: :string, nullable: true },
          app_version: { type: :string },
          home_location: { type: :object, nullable: true, properties: { lat: { type: :number }, lng: { type: :number } }, required: %w[lat lng] },
          timezone: { type: :string }
        },
        required: %w[anonymous_id platform]
      }

      response "201", "device registered" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Device" } }, required: %w[data]
        let(:body) { { anonymous_id: anonymous_id, platform: "ios", app_version: "0.1.0", timezone: "America/Los_Angeles", home_location: { lat: 33.6189, lng: -117.9289 } } }
        run_test! do
          expect(json.dig("data", "home_location")).to eq({ "lat" => 33.62, "lng" => -117.93 })
        end
      end

      response "200", "device updated" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Device" } }, required: %w[data]
        let!(:device) { create(:device, anonymous_id: anonymous_id, app_version: "0.0.9") }
        let(:body) { { anonymous_id: anonymous_id, platform: "ios", app_version: "0.1.0" } }
        run_test! do
          expect(device.reload.app_version).to eq("0.1.0")
        end
      end

      response "422", "invalid platform" do
        schema "$ref" => "#/components/schemas/Error"
        let(:body) { { anonymous_id: anonymous_id, platform: "watch" } }
        run_test!
      end
    end
  end

  path "/v1/devices/{anonymous_id}" do
    parameter name: :anonymous_id, in: :path, schema: { type: :string, format: :uuid }

    patch "Update push token, home location, or timezone" do
      tags "Devices"
      consumes "application/json"
      produces "application/json"
      parameter name: :body, in: :body, required: true, schema: {
        type: :object,
        properties: {
          push_token: { type: :string, nullable: true }, push_enabled: { type: :boolean }, app_version: { type: :string },
          home_location: { type: :object, nullable: true, properties: { lat: { type: :number }, lng: { type: :number } }, required: %w[lat lng] },
          timezone: { type: :string }
        }
      }

      response "200", "device updated" do
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Device" } }, required: %w[data]
        let!(:device) { create(:device, anonymous_id: anonymous_id) }
        let(:body) { { push_enabled: false, timezone: "America/New_York" } }
        run_test! do
          expect(device.reload).to have_attributes(push_enabled: false, timezone: "America/New_York")
        end
      end

      response "404", "unknown device" do
        schema "$ref" => "#/components/schemas/Error"
        let(:body) { { timezone: "UTC" } }
        run_test!
      end
    end
  end

  describe "scenarios" do
    it "upserts on anonymous_id and ignores user_id in a PATCH (AC-12)" do
      post "/v1/devices", params: { anonymous_id: anonymous_id, platform: "ios", app_version: "1", timezone: "UTC" }, as: :json
      post "/v1/devices", params: { anonymous_id: anonymous_id, platform: "ios", app_version: "2", timezone: "America/Los_Angeles" }, as: :json
      expect(Device.where(anonymous_id: anonymous_id).count).to eq(1)
      expect(Device.find_by(anonymous_id: anonymous_id)).to have_attributes(app_version: "2", timezone: "America/Los_Angeles")

      patch "/v1/devices/#{anonymous_id}", params: { user_id: create(:user).id, app_version: "3" }, as: :json
      expect(response).to have_http_status(:ok)
      expect(Device.find_by(anonymous_id: anonymous_id)).to have_attributes(user_id: nil, app_version: "3")

      patch "/v1/devices/#{SecureRandom.uuid}", params: { app_version: "4" }, as: :json
      expect(response).to have_http_status(:not_found)
    end
  end
end
