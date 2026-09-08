module Seeds
  # What `bin/rails seeds:import` and `seeds:all` actually do (events spec
  # R-32). It lives here rather than in the rake file so it can be tested
  # without `abort` taking the test process down with it.
  module Runner
    IMPORTERS = {
      "venues" => "Seeds::VenueRowImporter", "clubs" => "Seeds::ClubRowImporter",
      "sponsors" => "Seeds::SponsorRowImporter", "events" => "Seeds::EventRowImporter"
    }.freeze
    ORDER = %w[venues sponsors clubs events].freeze

    class Failure < StandardError; end

    # The kind defaults to the file name, so `seeds:import[db/seeds/events.csv]`
    # needs nothing else; pass it explicitly for a file named anything.
    def self.import(path, kind: nil, dry_run: false)
      raise Failure, "Usage: bin/rails seeds:import[db/seeds/events.csv]" if path.to_s.blank?
      raise Failure, "No such file: #{path}" unless File.exist?(path)

      name = kind.presence || File.basename(path, ".csv")
      importer = IMPORTERS[name]
      raise Failure, "Kind must be one of #{IMPORTERS.keys.join(', ')}, not #{name}." if importer.nil?

      importer.constantize.call(path.to_s, dry_run: dry_run)
    end

    # Every file present in db/seeds, in dependency order: an event row
    # naming an unknown club or sponsor slug is a row error.
    def self.import_all(directory: Rails.root.join("db/seeds"), dry_run: false, io: $stdout)
      ORDER.filter_map do |kind|
        path = File.join(directory.to_s, "#{kind}.csv")
        next io.puts("#{kind}.csv: not present, skipping") unless File.exist?(path)

        report = IMPORTERS.fetch(kind).constantize.call(path, dry_run: dry_run)
        io.puts report
        report
      end
    end
  end
end
