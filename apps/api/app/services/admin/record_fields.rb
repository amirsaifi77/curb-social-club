module Admin
  # The two form fields A05, A06, and later A11 all shape by hand: the six
  # social links, and a home point entered as two numbers. Returns the
  # problems it found rather than adding them to the record, because
  # `save` clears the errors collection before it validates.
  module RecordFields
    BAD_POINT = "must be a latitude and a longitude, or both blank.".freeze

    Problem = Data.define(:attribute, :message)

    def self.apply(record, attributes)
      record.assign_attributes(attributes.except(:home_lat, :home_lng, :links))
      assign_links(record, attributes)
      assign_home(record, attributes)
    end

    # Only when the form sent the key: a PATCH that leaves it out is not a
    # request to clear all six. A crafted non-hash is dropped, not raised on.
    def self.assign_links(record, attributes)
      return unless attributes.key?(:links)

      links = attributes[:links]
      record.links = links.respond_to?(:to_unsafe_h) ? links.to_unsafe_h : {}
    end

    # Both blank clears the point; one blank or unparseable is a form error,
    # never a silent no-op that reports "saved" and changes nothing.
    def self.assign_home(record, attributes)
      return [] unless attributes.key?(:home_lat) || attributes.key?(:home_lng)

      lat = attributes[:home_lat].to_s.strip
      lng = attributes[:home_lng].to_s.strip
      if lat.blank? && lng.blank?
        record.home_location = nil
        return []
      end

      point = Geo::Coordinates.point(lat, lng)
      return [ Problem.new(attribute: :home_location, message: BAD_POINT) ] if point.nil?

      record.home_location = point
      []
    end
    private_class_method :assign_links, :assign_home
  end
end
