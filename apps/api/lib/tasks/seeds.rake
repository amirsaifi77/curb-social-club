# frozen_string_literal: true

# bin/rails seeds:import[path] and seeds:all (events spec R-32): the same
# importers A07 runs, with dry_run off, printing the report. The work is in
# Seeds::Runner; this file only turns its failures into an exit status.
namespace :seeds do
  desc "Import a seed CSV (venues, sponsors, clubs, or events) and print the report"
  task :import, %i[path kind] => :environment do |_task, args|
    report = Seeds::Runner.import(args[:path], kind: args[:kind])
    puts report
    abort "#{report.counts[:error]} rows had errors." if report.errors?
  rescue Seeds::Runner::Failure => error
    abort error.message
  end

  desc "Import every seed CSV in db/seeds in dependency order"
  task all: :environment do
    reports = Seeds::Runner.import_all
    failed = reports.sum { |report| report.counts[:error] }
    abort "#{failed} rows had errors." if failed.positive?
  end

  desc "Import the fabricated development rows in db/seeds/dev (never in production)"
  task dev: :environment do
    reports = Seeds::DevFixtures.call
    failed = reports.sum { |report| report.counts[:error] }
    abort "#{failed} rows had errors." if failed.positive?
  rescue Seeds::DevFixtures::Refused => error
    abort error.message
  end
end
