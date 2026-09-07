require "rails_helper"

RSpec.describe Recurrence::RruleValidator do
  describe ".parse (R-4)" do
    it "accepts weekly rules with one or more weekdays and an interval of 1 to 4" do
      expect(described_class.parse("FREQ=WEEKLY;BYDAY=SA")).to have_attributes(freq: "WEEKLY", interval: 1, byday: [ "SA" ])
      expect(described_class.parse("FREQ=WEEKLY;INTERVAL=2;BYDAY=SU")).to have_attributes(interval: 2, byday: [ "SU" ])
      expect(described_class.parse("FREQ=WEEKLY;BYDAY=SA,SU")).to have_attributes(byday: %w[SA SU])
      expect(described_class.parse("BYDAY=MO;FREQ=WEEKLY;INTERVAL=4")).to have_attributes(interval: 4)
    end

    it "accepts monthly rules with exactly one ordinal day" do
      expect(described_class.parse("FREQ=MONTHLY;BYDAY=1SU")).to have_attributes(freq: "MONTHLY", byday: [ "1SU" ])
      expect(described_class.parse("FREQ=MONTHLY;BYDAY=-1SA")).to have_attributes(byday: [ "-1SA" ])
      expect(described_class.parse("FREQ=MONTHLY;INTERVAL=3;BYDAY=4TH")).to have_attributes(interval: 3)
    end

    it "rejects everything outside the grammar" do
      bad = [
        "FREQ=DAILY", "FREQ=WEEKLY", "FREQ=WEEKLY;BYDAY=SA;UNTIL=20261231T000000Z",
        "FREQ=WEEKLY;BYDAY=SA;COUNT=10", "FREQ=MONTHLY;BYDAY=SA,SU", "FREQ=MONTHLY;BYDAY=SA",
        "FREQ=MONTHLY;BYDAY=1SU,2SU", "FREQ=MONTHLY;BYDAY=5SU", "FREQ=MONTHLY;BYDAY=-2SA",
        "FREQ=WEEKLY;INTERVAL=5;BYDAY=SA", "FREQ=WEEKLY;INTERVAL=0;BYDAY=SA",
        "FREQ=WEEKLY;BYDAY=SA,SA", "FREQ=WEEKLY;BYDAY=XX", "FREQ=WEEKLY;BYDAY=", "BYDAY=SA",
        "FREQ=WEEKLY;BYDAY=SA;BYMONTH=6", "FREQ=WEEKLY;FREQ=WEEKLY;BYDAY=SA", "freq=weekly;byday=sa",
        "FREQ=WEEKLY;BYDAY=SA;", "", " ", nil, 42
      ]
      bad.each do |value|
        expect(described_class.parse(value)).to be_nil, "expected #{value.inspect} to be rejected"
      end
    end
  end

  describe "as a validator" do
    let(:model) do
      Class.new do
        include ActiveModel::Validations
        attr_accessor :rrule

        def self.name = "RuleHolder"
        validates :rrule, "recurrence/rrule": true
      end
    end

    it "adds the bad-rrule message for an invalid string and ignores nil" do
      holder = model.new
      holder.rrule = "FREQ=DAILY"
      expect(holder).not_to be_valid
      expect(holder.errors[:rrule]).to eq([ described_class::MESSAGE ])

      holder.rrule = nil
      expect(holder).to be_valid
    end
  end
end
