# Shared view helpers for the admin UI (docs/specs/admin.md R-26, R-27).
module AdminHelper
  ADMIN_ZONE = "America/Los_Angeles".freeze
  TIME_FORMAT = "%a %b %-d, %-l:%M %p %Z".freeze
  DATE_FORMAT = "%a %b %-d, %Y".freeze
  # The value an <input type="datetime-local"> reads and writes.
  LOCAL_INPUT_FORMAT = "%Y-%m-%dT%H:%M".freeze

  # R-27: admin times are Pacific with the zone abbreviation, lowercase
  # meridian, so a glance tells you which side of a DST change a row is on.
  def admin_time(time, zone: ADMIN_ZONE)
    return "" if time.blank?

    format_time(time.in_time_zone(zone))
  end

  # R-27: an occurrence reads in the event's own timezone, because that is
  # the clock the people standing there are on.
  def occurrence_time(occurrence, event = occurrence.event)
    admin_time(occurrence.starts_at, zone: event.timezone)
  end

  def admin_date(date)
    date.blank? ? "" : date.to_date.strftime(DATE_FORMAT)
  end

  # A datetime-local value in the given zone, for a form that edits a
  # timestamp as the local wall clock of the event.
  def local_input_value(time, zone)
    time.blank? ? "" : time.in_time_zone(zone).strftime(LOCAL_INPUT_FORMAT)
  end

  # Options for a picker that writes host_type and host_id in one field
  # (R-15). The app account leads the users group so a seeded meet gets the
  # default host without hunting for it.
  def host_picker_options(selected_type: nil, selected_id: nil)
    selected = selected_type.present? && selected_id.present? ? Admin::HostPicker.value(selected_type, selected_id) : nil
    current_user_id = selected_id if selected_type == "User"
    grouped_options_for_select(Admin::HostPicker.grouped_options(include_user_id: current_user_id), selected)
  end

  def yes_no(value) = value ? "yes" : "no"

  # The sponsorship rows A04 renders: the attached ones plus a couple of
  # empty slots to add more. The blanks are unattached, so rendering the
  # form never leaves half-built rows on the event.
  def sponsorship_rows(event, blanks: 2)
    rows = event.sponsorships.to_a
    spare = [ Event::MAX_SPONSORSHIPS - rows.size, 0 ].max.clamp(0, blanks)
    rows + Array.new(spare) { |i| EventSponsorship.new(event: event, position: rows.size + i) }
  end

  private

  def format_time(time)
    time.strftime(TIME_FORMAT).sub(/ (AM|PM) /) { " #{Regexp.last_match(1).downcase} " }
  end
end
