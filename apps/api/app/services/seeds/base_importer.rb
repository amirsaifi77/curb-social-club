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
      plans = rows.each_with_index.map { |row, index| plan(row, index + 1) }
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

    def parse(source)
      text = source.respond_to?(:read) ? source.read : File.read(source)
      table = CSV.parse(text.to_s.sub("\xEF\xBB\xBF", ""), headers: true, header_converters: :symbol)
      raise TooManyRows, TOO_MANY_ROWS if table.size > MAX_ROWS

      table
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
