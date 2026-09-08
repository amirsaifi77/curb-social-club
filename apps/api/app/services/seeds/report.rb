module Seeds
  # What an import run says it did (events spec R-29). One Row per CSV row,
  # in file order, with the 1-based row number the copy quotes (the header
  # is row 0, so the first data row is row 1).
  class Report
    ACTIONS = %w[create update skip error].freeze

    Row = Data.define(:number, :key, :action, :errors, :notes) do
      def error? = action == "error"
      def to_h = { number: number, key: key, action: action, errors: errors, notes: notes }
    end

    attr_reader :rows, :kind, :dry_run

    def initialize(kind:, dry_run:)
      @kind = kind
      @dry_run = dry_run
      @rows = []
    end

    def add(number:, key:, action:, errors: [], notes: [])
      raise ArgumentError, "Unknown action #{action}" unless ACTIONS.include?(action.to_s)

      rows << Row.new(number: number, key: key, action: action.to_s, errors: errors, notes: notes)
      rows.last
    end

    # A plan is made against the table as it was before the run, so a write
    # can discover something the plan could not: two rows naming one lot.
    # The row is corrected rather than left overstating what happened.
    def revise(number, action:, notes: [])
      index = rows.index { |row| row.number == number }
      return if index.nil?

      row = rows[index]
      rows[index] = Row.new(number: row.number, key: row.key, action: action.to_s,
                            errors: row.errors, notes: row.notes + notes)
    end

    def counts = ACTIONS.to_h { |action| [ action.to_sym, rows.count { |row| row.action == action } ] }
    def errors? = rows.any?(&:error?)
    # What Apply would write: everything the dry run did not reject.
    def applicable = counts[:create] + counts[:update]

    def to_h = { kind: kind, dry_run: dry_run, counts: counts, rows: rows.map(&:to_h) }

    def to_s
      lines = rows.map { |row| "  #{row.number}. #{row.key} #{row.action}#{row.errors.any? ? ": #{row.errors.join('; ')}" : ''}" }
      ([ "#{kind} (#{dry_run ? 'dry run' : 'applied'})" ] + lines + [ counts.map { |k, v| "#{v} #{k}" }.join(", ") ]).join("\n")
    end
  end
end
