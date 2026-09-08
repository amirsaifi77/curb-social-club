require "erb"
require "tmpdir"

module Seeds
  # `bin/rails seeds:dev` (docs/local-development.md): fabricated rows so a
  # fresh development database has meets, clubs, and sponsors on screen.
  #
  # Nothing here is seed data. `db/seeds/` holds rows somebody verified
  # against the organizer's own post (events spec R-30); `db/seeds/dev/`
  # holds invented ones, and `db/seeds/dev/README.md` lists the signals that
  # keep the two apart. Seeds::Runner.import_all reads `db/seeds`, so
  # `db/seeds.rb` never loads these, and this refuses to run in production.
  #
  # The templates render through ERB because the dates have to stay current:
  # a fixture meet whose verified_date aged past 30 days would go stale
  # (R-25) and past 90 dormant (R-26), which drops it out of every list.
  class DevFixtures
    class Refused < StandardError; end
    class MissingTemplate < StandardError; end

    REFUSED = "seeds:dev writes fabricated rows and refuses to run in production.".freeze
    # Rails.env alone would not stop `DATABASE_URL=<staging url> bin/rails
    # seeds:dev` from a development shell, which is a command this repo's own
    # setup doc teaches the shape of.
    WRONG_DATABASE = "seeds:dev refuses to write to %s: it is neither a development nor a test database.".freeze
    SAFE_DATABASE = /_(development|test)([-_]\d+)?\z/
    DIRECTORY = "db/seeds/dev".freeze
    # Kept in the order Seeds::Runner imports them, which is also the order
    # they depend on each other in.
    TEMPLATES = %w[sponsors clubs events].freeze
    # Club owners and one event host. Handles are `dev_` prefixed for the
    # same reason slugs are `dev-` prefixed: the rows a person reads are
    # labelled where they are named. What the prefixes do not reach is in
    # db/seeds/dev/README.md, and `clear` is what actually removes it all.
    PEOPLE = {
      "dev_ava" => "Ava (fixture)",
      "dev_mateo" => "Mateo (fixture)"
    }.freeze

    def self.call(...) = new(...).call

    # No `now:` seam: Seeds::Runner does not take one, so a clock this
    # class held alone would render dates the importers then rejected as
    # being in the future. Tests travel instead.
    def initialize(io: $stdout, directory: Rails.root.join(DIRECTORY))
      @io = io
      @directory = Pathname(directory)
    end

    def call
      guard
      people
      Dir.mktmpdir("curb-dev-fixtures") do |tmp|
        render_into(Pathname(tmp))
        reports = Seeds::Runner.import_all(directory: Pathname(tmp), io: io)
        memberships
        reports
      end
    end

    # Everything `call` wrote, including the rows no prefix reaches. Venues
    # are shared through Venues::Deduper (events spec R-6), so a lot a
    # verified event has since attached to is kept; only one nothing else
    # uses is removed.
    def clear
      guard

      events = Event.where("slug LIKE ?", "dev-%")
      venue_ids = events.distinct.pluck(:venue_id)
      counts = { events: events.count }
      events.destroy_all

      counts[:venues] = Venue.where(id: venue_ids).where.missing(:events).destroy_all.size
      counts[:clubs] = Club.where("slug LIKE ?", "dev-%").destroy_all.size
      counts[:sponsors] = Sponsor.where("slug LIKE ?", "dev-%").destroy_all.size
      counts[:people] = User.where(id: Profile.where(handle: PEOPLE.keys).select(:user_id)).destroy_all.size

      io.puts counts.map { |kind, count| "#{count} #{kind}" }.join(", ") + " removed"
      counts
    end

    private

    attr_reader :io, :directory

    def guard
      raise Refused, REFUSED if Rails.env.production?

      database = ActiveRecord::Base.connection_db_config.database.to_s
      raise Refused, format(WRONG_DATABASE, database) unless SAFE_DATABASE.match?(database)
    end

    # Two ordinary members, plus the app account a blank host column means.
    # A CSV cannot create a user and a club row names its owner by handle,
    # so these come first.
    def people
      Seeds::AppAccount.ensure!
      PEOPLE.each do |handle, display_name|
        next if Profile.exists?(handle: handle)

        User.transaction do
          user = User.create!(role: "member", status: "active", terms_accepted_at: Time.current)
          Profile.create!(user: user, handle: handle, display_name: display_name, is_host: true)
        end
        io.puts "created @#{handle}"
      end
    end

    # The club importer gives a club its owner and nobody else, so S13 would
    # be a one-row list. Everybody joins everything.
    def memberships
      clubs = Club.where("slug LIKE ?", "dev-%")
      Profile.where(handle: PEOPLE.keys).includes(:user).each do |profile|
        clubs.each do |club|
          membership = club.memberships.find_or_initialize_by(user: profile.user)
          next if membership.persisted?

          membership.update!(role: "member", status: "active")
        end
      end
    end

    # Rendered under the names Seeds::Runner expects, because it keys the
    # importer off the file name.
    def render_into(target)
      dates = Dates.new
      TEMPLATES.each do |kind|
        template = directory.join("#{kind}.csv.erb")
        raise MissingTemplate, "No such template: #{template}" unless template.exist?

        target.join("#{kind}.csv").write(dates.render(template.read))
      end
    end

    # The only thing the templates may call. Weekdays are resolved against
    # the app's zone rather than the venue's: the dates decide which meets
    # have already happened, not what time anything starts.
    class Dates
      def initialize
        @today = Time.current.in_time_zone(Venue::DEFAULT_TIMEZONE).to_date
      end

      def render(source) = ERB.new(source, trim_mode: "-").result(binding)

      def today = @today.iso8601

      # The named weekday `weeks` whole weeks before the most recent one, so
      # a recurring meet has a history behind it and materializes forward.
      def past(weekday, weeks:) = (@today.prev_occurring(weekday) - weeks.weeks).iso8601

      # The named weekday `weeks` whole weeks after the next one, for the
      # one-off meet and for a seasonal series that has not ended yet.
      def future(weekday, weeks:) = (@today.next_occurring(weekday) + weeks.weeks).iso8601
    end
  end
end
