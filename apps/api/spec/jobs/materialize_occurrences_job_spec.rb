require "rails_helper"

RSpec.describe MaterializeOccurrencesJob do
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  it "completes past scheduled rows, keeps occurrences_count right, and materializes every eligible event (R-9, R-10)" do
    weekly = create(:event, :weekly, :published)
    ended = create(:event_occurrence, :past, event: weekly)
    in_progress = create(:event_occurrence, event: weekly, starts_at: 30.minutes.ago)
    cancelled_past = create(:event_occurrence, :cancelled, event: weekly, starts_at: 3.days.ago)
    draft = create(:event, :weekly)
    announced = create(:event, :announced, :published)
    dormant = create(:event, :weekly, :published, dormant_at: 1.day.ago)
    once = create(:event, :published)

    described_class.perform_now
    described_class.perform_now

    expect(ended.reload).to have_attributes(status: "completed")
    expect(in_progress.reload).to have_attributes(status: "scheduled")
    expect(cancelled_past.reload).to have_attributes(status: "cancelled")
    expect(weekly.occurrences.scheduled.where("starts_at > ?", Time.current).count).to be_between(12, 14)
    expect(weekly.reload.occurrences_count).to eq(weekly.occurrences.scheduled.count)
    expect(draft.occurrences.count).to eq(0)
    expect(announced.occurrences.count).to eq(0)
    expect(dormant.occurrences.count).to eq(0)
    expect(once.occurrences.count).to eq(1)
  end

  it "reports one event's failure and still materializes the rest in the nightly run" do
    broken = create(:event, :weekly, :published)
    healthy = create(:event, :weekly, :published)
    allow(Recurrence::Materializer).to receive(:call).and_call_original
    allow(Recurrence::Materializer).to receive(:call).with(broken).and_raise(ArgumentError, "bad rule")
    allow(Rails.logger).to receive(:error)

    expect { described_class.perform_now }.not_to raise_error
    expect(healthy.occurrences.count).to be_between(12, 14)
    expect(Rails.logger).to have_received(:error).with(/#{broken.id}.*ArgumentError: bad rule/)
  end

  it "materializes one event when given its id and ignores an unknown id" do
    event = create(:event, :weekly, :published)
    other = create(:event, :weekly, :published)

    described_class.perform_now(event.id)
    expect(event.occurrences.count).to be_between(12, 14)
    expect(other.occurrences.count).to eq(0)
    expect { described_class.perform_now(SecureRandom.uuid) }.not_to raise_error
  end

  describe "enqueueing from Event (R-10)" do
    it "runs after create and after a schedule change of a published event, not otherwise" do
      expect { create(:event, :weekly, :published) }.to have_enqueued_job(described_class)
      draft = nil
      expect { draft = create(:event, :weekly) }.not_to have_enqueued_job(described_class)

      expect { draft.update!(title: "Renamed") }.not_to have_enqueued_job(described_class)
      expect { draft.update!(status: "published") }.to have_enqueued_job(described_class).with(draft.id)
      expect { draft.update!(title: "Renamed again") }.not_to have_enqueued_job(described_class)
      expect { draft.update!(rrule: "FREQ=WEEKLY;BYDAY=SU") }.to have_enqueued_job(described_class).with(draft.id)
      expect { draft.update!(duration_minutes: 90) }.to have_enqueued_job(described_class).with(draft.id)
      expect { draft.update!(venue: create(:venue, :inland)) }.to have_enqueued_job(described_class).with(draft.id)

      expect { draft.update!(dormant_at: Time.current) }.not_to have_enqueued_job(described_class)
      expect { draft.update!(dormant_at: nil) }.to have_enqueued_job(described_class).with(draft.id)
      expect { create(:event, :announced, :published) }.not_to have_enqueued_job(described_class)
    end
  end
end
