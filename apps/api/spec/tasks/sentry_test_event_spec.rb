require "rails_helper"
require "rake"

RSpec.describe "sentry:test_event", type: :task do
  before(:all) { Rails.application.load_tasks if Rake::Task.tasks.empty? } # rubocop:disable RSpec/BeforeAfterAll

  after { Rake::Task["sentry:test_event"].reenable }

  it "refuses to run without a DSN" do
    expect { Rake::Task["sentry:test_event"].invoke }
      .to raise_error(SystemExit).and output(/SENTRY_DSN is not set/).to_stderr
  end

  it "sends one message and prints the event id when Sentry is initialized" do
    client = instance_double(Sentry::Client, flush: nil)
    event = instance_double(Sentry::Event, event_id: "abc123")
    allow(Sentry).to receive_messages(initialized?: true, capture_message: event, get_current_client: client)
    expect { Rake::Task["sentry:test_event"].invoke }.to output(/Sent event abc123 to test/).to_stdout
    expect(client).to have_received(:flush)
    expect(Sentry).to have_received(:capture_message).with("Sentry test event from api", level: :info)
  end
end
