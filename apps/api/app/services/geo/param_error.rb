module Geo
  # A query parameter the list or map endpoints cannot use; the controller
  # renders it as 400 bad_request with the message.
  class ParamError < StandardError; end
end
