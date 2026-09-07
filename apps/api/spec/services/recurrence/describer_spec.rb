require "rails_helper"

RSpec.describe Recurrence::Describer do
  let(:zone) { ActiveSupport::TimeZone["America/Los_Angeles"] }

  def text(cadence, rrule, **attrs)
    described_class.call(Event.new(cadence: cadence, rrule: rrule, timezone: zone.name, **attrs))
  end

  it "returns the exact Copy table strings (R-15)" do
    expect(text("weekly", "FREQ=WEEKLY;BYDAY=SA")).to eq("Every Saturday")
    expect(text("weekly", "FREQ=WEEKLY;INTERVAL=2;BYDAY=SU")).to eq("Every other Sunday")
    expect(text("monthly", "FREQ=MONTHLY;BYDAY=1SU")).to eq("First Sunday of the month")
    expect(text("monthly", "FREQ=MONTHLY;BYDAY=-1SA")).to eq("Last Saturday of the month")
    expect(text("seasonal", "FREQ=WEEKLY;BYDAY=SA", rrule_until: zone.parse("2026-10-31").end_of_day)).to eq("Every Saturday through Oct 31")
    expect(text("announced", nil)).to eq("Dates announced by the host")
    expect(text("once", nil)).to be_nil
  end

  it "covers the rest of the grammar" do
    expect(text("weekly", "FREQ=WEEKLY;BYDAY=SA,SU")).to eq("Every Saturday and Sunday")
    expect(text("weekly", "FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,WE,FR")).to eq("Every 3 weeks on Monday, Wednesday, and Friday")
    expect(text("monthly", "FREQ=MONTHLY;BYDAY=3TH")).to eq("Third Thursday of the month")
    expect(text("monthly", "FREQ=MONTHLY;INTERVAL=2;BYDAY=2FR")).to eq("Second Friday of every other month")
    expect(text("monthly", "FREQ=MONTHLY;INTERVAL=4;BYDAY=4TU")).to eq("Fourth Tuesday every 4 months")
    expect(text("seasonal", "FREQ=MONTHLY;BYDAY=-1SA", rrule_until: zone.parse("2027-03-01").end_of_day)).to eq("Last Saturday of the month through Mar 1")
    expect(text("weekly", nil)).to be_nil
  end

  it "is exposed as Event#rrule_text" do
    expect(build(:event, :monthly).rrule_text).to eq("First Sunday of the month")
  end
end
