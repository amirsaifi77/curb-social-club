module Geo
  # Opaque keyset cursor: base64 of a JSON array whose first element names
  # the sort it belongs to, so a cursor from one ordering cannot be replayed
  # against another. Callers validate the decoded values themselves.
  class Cursor
    INVALID = "cursor is invalid."

    def self.encode(sort, values)
      Base64.urlsafe_encode64(JSON.generate([ sort.to_s, *values ]), padding: false)
    end

    def self.decode(string, sort:, size:)
      values = JSON.parse(Base64.urlsafe_decode64(string.to_s))
      raise ParamError, INVALID unless values.is_a?(Array) && values.first == sort.to_s && values.size == size + 1

      values.drop(1)
    rescue ArgumentError, JSON::ParserError
      raise ParamError, INVALID
    end
  end
end
