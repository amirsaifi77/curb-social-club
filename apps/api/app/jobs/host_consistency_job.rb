# Nightly at 02:30 America/Los_Angeles (config/recurring.yml): reports every
# published event whose host row is missing or whose club or sponsor is
# hidden, and rewrites any host_name that drifted from the host's current
# name (events spec R-31, clubs R-24, sponsors R-21). It only reports: a
# hidden club or sponsor keeps hosting its events (clubs R-5, sponsors
# R-5). The latest report is cached under REPORT_KEY for the admin
# dashboard (A02, admin.md R-13) to read in 1.9.
class HostConsistencyJob < ApplicationJob
  REPORT_KEY = "host_consistency:latest".freeze
  REPORT_TTL = 30.days

  queue_as :default

  def perform(now: Time.current)
    report = { generated_at: now.utc.iso8601, missing: [], hidden: [], renamed: [] }
    Event::HOST_TYPES.each { |host_type| audit(host_type, report, now) }
    Rails.cache.write(REPORT_KEY, report, expires_in: REPORT_TTL)
    log(report)
    report
  end

  private

  # Rows are (id, slug, host_id, host_name) so the pass costs one query per
  # host type plus one for the hosts themselves.
  def audit(host_type, report, now)
    rows = Event.published.where(host_type: host_type).order(:slug).pluck(:id, :slug, :host_id, :host_name)
    return if rows.empty?

    hosts = current_names(host_type, rows.map { |row| row[2] }.uniq)
    renames = Hash.new { |hash, key| hash[key] = [] }

    rows.each do |id, slug, host_id, host_name|
      host = hosts[host_id]
      next report[:missing] << { slug: slug, host_type: host_type, host_id: host_id } if host.nil?

      report[:hidden] << { slug: slug, host_type: host_type, host_id: host_id, name: host[:name] } if host[:hidden]
      next if host[:name] == host_name

      report[:renamed] << { slug: slug, from: host_name, to: host[:name] }
      renames[host[:name]] << id
    end

    renames.each { |name, ids| Event.where(id: ids).update_all(host_name: name, updated_at: now) }
  end

  # { host_id => { name:, hidden: } } for the hosts these events name.
  def current_names(host_type, ids)
    case host_type
    when "User"
      Profile.where(user_id: ids).pluck(:user_id, :display_name).to_h { |id, name| [ id, { name: name, hidden: false } ] }
    when "Club"
      Club.where(id: ids).pluck(:id, :name, :status).to_h { |id, name, status| [ id, { name: name, hidden: status == "hidden" } ] }
    when "Sponsor"
      Sponsor.where(id: ids).pluck(:id, :name, :status).to_h { |id, name, status| [ id, { name: name, hidden: status == "hidden" } ] }
    else {}
    end
  end

  def log(report)
    Rails.logger.info("HostConsistencyJob: #{report[:missing].size} missing, #{report[:hidden].size} hidden, " \
                      "#{report[:renamed].size} host_name rewritten")
    return unless defined?(Sentry) && Sentry.initialized?

    Sentry.add_breadcrumb(Sentry::Breadcrumb.new(category: "events", message: "host consistency: " \
      "#{report[:missing].size} missing, #{report[:hidden].size} hidden, #{report[:renamed].size} rewritten"))
  end
end
