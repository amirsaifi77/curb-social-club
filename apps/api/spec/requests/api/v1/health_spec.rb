require "swagger_helper"

RSpec.describe "v1/health" do
  path "/v1/health" do
    get "Service health" do
      description "Liveness check: database reachability and Solid Queue lag."
      tags "Health"
      produces "application/json"

      response "200", "service is healthy" do
        schema type: :object,
               properties: {
                 status: { type: :string, enum: %w[ok degraded] },
                 db: { type: :boolean },
                 queue_lag_s: { type: :integer, nullable: true }
               },
               required: %w[status db queue_lag_s]

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["status"]).to eq("ok")
          expect(body["db"]).to be(true)
          expect(body["queue_lag_s"]).to eq(0)
        end
      end
    end
  end
end
