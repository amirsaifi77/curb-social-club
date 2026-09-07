# The feature flags in config/features.yml (a plain hash read at boot, no
# gem). Unknown names raise so a typo in a controller fails loudly in specs.
module Features
  def self.enabled?(name)
    flags.fetch(name.to_sym) { raise ArgumentError, "unknown feature flag #{name}" }
  end

  def self.flags
    Rails.configuration.x.features
  end
end
