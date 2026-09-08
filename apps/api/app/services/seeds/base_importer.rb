require "csv"

module Seeds
  # Shared shape of the four CSV importers (events spec R-29, admin R-21).
  # Every row is validated before any is written, so a file with one bad
  # row writes nothing until that row is fixed. A run either reports
  # (`dry_run: true`) or reports and writes, and re-running the same file
  # reports every row `skip`.
  class BaseImporter
    MAX_ROWS = 500
    TOO_MANY_ROWS = "Files are limited to #{MAX_ROWS} rows. Split the file.".freeze

    class TooManyRows < StandardError; end
    # A file that cannot be parsed at all, as opposed to a row that cannot
    # be written: the caller shows the message rather than a stack trace.
    class Unreadable < StandardError; end

    def self.call(source, dry_run: false, now: Time.current)
      new(source, dry_run: dry_run, now: now).call
    end

    def self.kind = name.demodulize.delete_suffix("RowImporter").underscore

    def initialize(source, dry_run:, now: Time.current)
      @rows = parse(source)
      @dry_run = dry_run
      @now = now
      @report = Report.new(kind: self.class.kind, dry_run: dry_run)
    end

    # Validate everything, then write nothing on a dry run and everything
    # writable in one transaction otherwise. A row that fails validation is
    # reported and skipped; it never stops the rows around it.
    def call
      duplicates = duplicate_keys
      plans = rows.each_with_index.map do |row, index|
        number = index + 1
        next report.add(number: number, key: key_for(row).to_s, action: "error", errors: duplicates[number]) if duplicates[number]

        plan(row, number)
      end
      return report if dry_run

      # grep, not compact: `plan` returns the Report::Row it added for a row
      # that is an error or a no-op, and only a Plan is ever written.
      ActiveRecord::Base.transaction do
        plans.grep(self.class::Plan).each { |plan| apply(plan) }
      end
      report
    end

    private

    attr_reader :rows, :dry_run, :now, :report

    # ActiveStorage::Blob#open yields a binmode file, so the bytes arrive as
    # ASCII-8BIT and any accent or byte-order mark would blow up the moment
    # they met a UTF-8 pattern. The encoding is declared before anything
    # touches the text.
    def parse(source)
      raw = source.respond_to?(:read) ? source.read : File.read(source, mode: "rb")
      text = raw.to_s.dup.force_encoding(Encoding::UTF_8).delete_prefix("\uFEFF")
      raise Unreadable, "The file is not valid UTF-8. Save it as UTF-8 and upload it again." unless text.valid_encoding?

      table = CSV.parse(text, headers: true, header_converters: :symbol)
      raise TooManyRows, TOO_MANY_ROWS if table.size > MAX_ROWS

      table
    rescue CSV::MalformedCSVError => error
      raise Unreadable, "The file is not readable as CSV: #{error.message}"
    end

    # Two rows with one natural key would pass validation separately and
    # then collide on the unique index, taking the whole apply down with
    # them. A copy-pasted row is the likeliest mistake in a hand-written
    # file, so it is a row error rather than a rollback.
    def duplicate_keys
      seen = {}
      rows.each_with_index.each_with_object({}) do |(row, index), found|
        self.class::UNIQUE_COLUMNS.each do |column|
          value = normalized_key(row, column)
          next if value.blank?

          first = seen[[ column, value ]]
          next seen[[ column, value ]] = index + 1 if first.nil?

          # Every column that clashes, not only the last one looked at: a
          # copy-pasted row repeats the slug and the source url both.
          (found[index + 1] ||= []) << "#{column} #{value} is already used by row #{first} of this file."
        end
      end
    end

    def normalized_key(row, column)
      value(row, column)&.downcase
    end

    def key_for(row)
      value(row, self.class::UNIQUE_COLUMNS.first) || "(no #{self.class::UNIQUE_COLUMNS.first})"
    end

    def value(row, key)
      text = row[key].to_s.strip
      text.presence
    end

    def required(row, keys)
      keys.filter_map { |key| "#{key} is required." if value(row, key).blank? }
    end

    def pipe_list(row, key)
      value(row, key).to_s.split("|").map(&:strip).reject(&:blank?)
    end
  end
end
