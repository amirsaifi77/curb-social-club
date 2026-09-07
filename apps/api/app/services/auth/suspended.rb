module Auth
  # A suspended user tried to sign in or use a session (R-10, R-20).
  class Suspended < StandardError; end
end
