module Auth
  # Any verification failure: the API answers 401 with one message and never
  # says which check failed (R-6).
  class InvalidToken < StandardError; end
end
