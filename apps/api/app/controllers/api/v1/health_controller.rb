module Api
  module V1
    class HealthController < ApplicationController
      # GET /v1/health
      # { status: "ok", db: true, queue_lag_s: 3 } per docs/api.md; 503 with
      # status "degraded" when the database is unreachable, so a host health
      # check (render.yaml) fails instead of reading a 200.
      def show
        db = database_reachable?
        render json: { status: db ? "ok" : "degraded", db: db, queue_lag_s: queue_lag_s },
               status: db ? :ok : :service_unavailable
      end

      private

      def database_reachable?
        ActiveRecord::Base.connection.select_value("SELECT 1") == 1
      rescue StandardError
        false
      end

      # Age in whole seconds of the oldest job that is ready but not yet
      # claimed by a worker; 0 when the queue is empty, null when the queue
      # tables are unreachable.
      def queue_lag_s
        oldest = SolidQueue::ReadyExecution.minimum(:created_at)
        oldest ? (Time.current - oldest).round : 0
      rescue StandardError
        nil
      end
    end
  end
end
