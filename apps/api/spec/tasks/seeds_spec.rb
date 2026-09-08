require "rails_helper"
require "rake"

# docs/specs/events-and-occurrences.md R-32: the task is a thin wrapper, so
# it is checked for wiring and exit status, not for import behaviour.
Rails.application.load_tasks unless Rake::Task.task_defined?("seeds:import")

RSpec.describe "seeds rake tasks", type: :task do
  before do
    create(:app_account)
    %w[seeds:import seeds:all].each { |name| Rake::Task[name].reenable }
  end

  def fixture(name) = Rails.root.join("spec/fixtures/seeds/#{name}").to_s

  it "runs the importer and prints the report" do
    output = capture_stdout { Rake::Task["seeds:import"].invoke(fixture("clubs_3.csv"), "clubs") }

    expect(Club.count).to eq(3)
    expect(output).to include("club (applied)", "back-bay-air-cooled create", "3 create")
  end

  it "exits non-zero when rows had errors, having written the valid rows (AC-13)" do
    create(:club, slug: "back-bay-air-cooled")
    expect { capture_stdout { Rake::Task["seeds:import"].invoke(fixture("events_12.csv"), "events") } }
      .to raise_error(SystemExit)
    expect(Event.count).to eq(10)
  end

  it "exits non-zero with the runner's message when the path is wrong" do
    expect { Rake::Task["seeds:import"].invoke("db/seeds/nope.csv") }.to raise_error(SystemExit)
  end

  def capture_stdout
    original = $stdout
    $stdout = StringIO.new
    yield
    $stdout.string
  ensure
    $stdout = original
  end
end
