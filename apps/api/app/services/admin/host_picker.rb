module Admin
  # The A04 host picker (docs/specs/admin.md R-15): one select whose option
  # value carries the type and the id, so the form writes host_type and
  # host_id together and they can never disagree. host_name follows from the
  # Event callback (events spec R-2).
  module HostPicker
    SEPARATOR = ":".freeze

    def self.value(type, id) = [ type, id ].join(SEPARATOR)

    # [type, id], or nil for anything that is not a known host type and a
    # plausible id, so a crafted value is dropped rather than raising.
    def self.parse(value)
      type, id = value.to_s.split(SEPARATOR, 2)
      return nil unless Event::HOST_TYPES.include?(type) && id.to_s.match?(Device::UUID)

      [ type, id ]
    end

    # The app account first, so a seeded meet gets the default user host
    # without hunting for it, then the rest by name. `include_user_id` keeps
    # an event's current host in the list even when that user is not marked
    # a host, so the form never shows a blank where a host is set.
    def self.grouped_options(include_user_id: nil)
      [ [ "Users", user_options(include_user_id) ],
        [ "Clubs", named_options(Club) ],
        [ "Sponsors", named_options(Sponsor) ] ]
    end

    def self.user_options(include_user_id = nil)
      app_account = User.app_account
      rows = Profile.where(is_host: true)
      rows = rows.or(Profile.where(user_id: include_user_id)) if include_user_id
      options = rows.order(:display_name).map do |profile|
        [ "#{profile.display_name} (@#{profile.handle})", value("User", profile.user_id) ]
      end
      options.partition { |_label, id| app_account && id == value("User", app_account.id) }.flatten(1)
    end

    def self.named_options(model)
      model.order(:name).pluck(:name, :id).map { |name, id| [ name, value(model.name, id) ] }
    end
    private_class_method :user_options, :named_options
  end
end
