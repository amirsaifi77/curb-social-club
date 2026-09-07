module Admin
  # Solid Queue health for the dashboard (docs/specs/admin.md R-13): queue
  # counts and the last run of every recurring task the scheduler has
  # loaded, read from the Solid Queue tables on the primary database.
  class JobHealth
    Task = Struct.new(:key, :class_name, :schedule, :last_run_at, :last_status, keyword_init: true)

    def failed = SolidQueue::FailedExecution.count
    def ready = SolidQueue::ReadyExecution.count
    def scheduled = SolidQueue::ScheduledExecution.count
    def in_progress = SolidQueue::ClaimedExecution.count

    def tasks
      SolidQueue::RecurringTask.order(:key).map do |task|
        run = SolidQueue::RecurringExecution.where(task_key: task.key).order(run_at: :desc).first
        Task.new(key: task.key, class_name: task.class_name || task.command, schedule: task.schedule,
                 last_run_at: run&.run_at, last_status: run && status_of(run))
      end
    end

    private

    def status_of(run)
      job = SolidQueue::Job.find_by(id: run.job_id)
      return "unknown" unless job
      return "failed" if SolidQueue::FailedExecution.exists?(job_id: job.id)

      job.finished_at ? "finished" : "pending"
    end
  end
end
