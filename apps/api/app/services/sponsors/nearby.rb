module Sponsors
  # The feed's sponsors_nearby section (sponsors R-12): active sponsors
  # inside the browse radius that host or back a scheduled occurrence
  # inside it, ordered by the soonest such meet then by distance. The
  # occurrence has to be nearby too, so a sponsor whose only meet is an
  # hour away does not surface as "near you" (AC-11). No paid key exists
  # at launch and none may be added without the label (R-13).
  #
  # The soonest meet comes from a lateral join rather than a correlated
  # subselect, so Postgres stops at the first row per sponsor and the
  # predicate is planned once instead of twice.
  class Nearby
    def self.call(origin:, radius_km:, limit:, now: Time.current)
      point = Geo.point_sql(origin.lat, origin.lng)
      radius_m = (radius_km.to_f * 1000).round

      Sponsor.visible
             .select(Arel.sql("sponsors.*"))
             .select(Arel.sql("ST_Distance(sponsors.home_location, #{point})::integer AS distance_m"))
             .select(Arel.sql("soonest.starts_at AS soonest_at"))
             .joins(soonest_join(point, radius_m, now))
             .where("ST_DWithin(sponsors.home_location, #{point}, ?)", radius_m)
             .with_attached_logo
             .order(Arel.sql("soonest_at ASC, distance_m ASC, sponsors.id ASC"))
             .limit(limit)
             .to_a
    end

    # The soonest scheduled occurrence inside the radius and the horizon,
    # for an event the sponsor hosts or is attached to.
    def self.soonest_join(point, radius_m, now)
      Sponsor.sanitize_sql_array([ <<~SQL.squish, now, now + Geo::Window::MAX_SPAN, radius_m ])
        JOIN LATERAL (
          SELECT o.starts_at FROM event_occurrences o
            JOIN events e ON e.id = o.event_id
           WHERE o.status = 'scheduled'
             AND e.status = 'published' AND e.visibility = 'public'
             AND e.hidden_at IS NULL AND e.dormant_at IS NULL
             AND o.starts_at BETWEEN ? AND ?
             AND ST_DWithin(o.location, #{point}, ?)
             AND ((e.host_type = 'Sponsor' AND e.host_id = sponsors.id)
                  OR EXISTS (SELECT 1 FROM event_sponsorships es
                              WHERE es.sponsor_id = sponsors.id AND es.event_id = e.id))
           ORDER BY o.starts_at ASC
           LIMIT 1
        ) soonest ON TRUE
      SQL
    end
    private_class_method :soonest_join
  end
end
