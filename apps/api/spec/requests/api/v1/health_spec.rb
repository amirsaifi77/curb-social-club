require "swagger_helper"

RSpec.describe "v1/health" do
  it_behaves_like "anonymous-allowed", "/v1/health"

  path "/v1/health" do
    get "Service health" do
      description "Liveness check: database reachability and Solid Queue lag. 503 while the database is unreachable."
      tags "Health"
      produces "application/json"

      health_schema = {
        type: :object,
        properties: {
          status: { type: :string, enum: %w[ok degraded] },
          db: { type: :boolean },
          queue_lag_s: { type: :integer, nullable: true }
        },
        required: %w[status db queue_lag_s]
      }

      response "200", "service is healthy" do
        schema health_schema

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["status"]).to eq("ok")
          expect(body["db"]).to be(true)
          expect(body["queue_lag_s"]).to eq(0)
        end
      end

      response "503", "database unreachable" do
        schema health_schema

        before do
          allow(ActiveRecord::Base).to receive(:connection).and_raise(ActiveRecord::ConnectionNotEstablished, "down")
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["status"]).to eq("degraded")
          expect(body["db"]).to be(false)
        end
      end
    end
  end
end
