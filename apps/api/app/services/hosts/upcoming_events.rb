module Hosts
  # The "upcoming meets" block on a club or sponsor page. Runs the same
  # direct list query the endpoints use, so one definition of "upcoming"
  # serves the page and its See all link.
  class UpcomingEvents
    def self.for(host, limit:)
      params = host.is_a?(Sponsor) ? { sponsor: host.id } : { host: "club:#{host.id}" }
      Geo::EventsList.call(ActionController::Parameters.new(params.merge(limit: limit))).items
    end

    # sponsors R-8: an event the sponsor both hosts and is attached to is
    # labelled host.
    def self.relation(event, sponsor)
      event.host_type == "Sponsor" && event.host_id == sponsor.id ? "host" : "sponsor"
    end
  end
end
