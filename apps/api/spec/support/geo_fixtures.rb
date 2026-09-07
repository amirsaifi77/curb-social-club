# The real coordinates from docs/specs/events-and-occurrences.md Acceptance
# criteria, as [lat, lng]. Geo specs use these, never mocks.
module GeoFixtures
  COASTAL = {
    lido: [ 33.6172, -117.9270 ],
    corona_del_mar: [ 33.5990, -117.8740 ],
    huntington_beach_pier: [ 33.6553, -118.0036 ],
    laguna_main_beach: [ 33.5422, -117.7831 ],
    irvine_spectrum: [ 33.6497, -117.7441 ],
    dana_point_harbor: [ 33.4600, -117.6980 ],
    san_clemente_pier: [ 33.4207, -117.6208 ],
    victoria_gardens: [ 34.1090, -117.5310 ]
  }.freeze

  INLAND = {
    fontana_sierra_at_foothill: [ 34.1065, -117.4356 ],
    victoria_gardens: [ 34.1090, -117.5310 ],
    ontario_mills: [ 34.0737, -117.5545 ],
    riverside_mission_inn: [ 33.9825, -117.3735 ],
    redlands_state_street: [ 34.0556, -117.1825 ]
  }.freeze

  ALL = COASTAL.merge(INLAND).freeze

  def self.point(name)
    lat, lng = ALL.fetch(name)
    Geo.point(lat, lng)
  end

  # Next Saturday 07:30 America/Los_Angeles, the default starts_at in the ACs.
  def self.next_saturday_0730
    zone = ActiveSupport::TimeZone["America/Los_Angeles"]
    today = zone.today
    days = (6 - today.wday) % 7
    days = 7 if days.zero?
    zone.local(today.year, today.month, today.day, 7, 30) + days.days
  end
end
