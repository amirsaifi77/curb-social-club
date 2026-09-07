require "rails_helper"

RSpec.describe AdminAudit do
  let(:admin) { create(:user, role: "admin") }

  it "records the admin, action, target, changes, and ip (R-1)" do
    target = create(:user)
    audit = described_class.record(admin: admin, action: "update", target: target,
                                   changes: { name: [ "Old", "New" ], nested: { note: "x" } }, ip: "203.0.113.9")
    expect(audit).to be_persisted
    expect(audit).to have_attributes(admin_id: admin.id, action: "update", target_type: "User", target_id: target.id)
    expect(audit.changeset).to eq({ "name" => [ "Old", "New" ], "nested" => { "note" => "x" } })
    expect(audit.ip.to_s).to eq("203.0.113.9")
    expect(audit.created_at).to be_present
  end

  it "allows a nil admin and a nil target for batch and rake actions" do
    audit = described_class.record(admin: nil, action: "import_csv", changes: { "rows" => 12 })
    expect(audit.admin_id).to be_nil
    expect(audit.target_type).to be_nil
    expect(audit.target_id).to be_nil
  end

  it "truncates long strings at 2,000 chars, nested values included" do
    long = "a" * 5_000
    audit = described_class.record(admin: admin, action: "create", changes: { "description" => [ nil, long ], "meta" => { "note" => long } })
    expect(audit.changeset["description"].last.length).to eq(2_000)
    expect(audit.changeset.dig("meta", "note").length).to eq(2_000)
  end

  it "requires an action" do
    expect { described_class.record(admin: admin, action: nil) }.to raise_error(ActiveRecord::RecordInvalid)
  end

  it "keeps the row when the admin account is purged" do
    audit = described_class.record(admin: admin, action: "update")
    admin.destroy!
    expect(audit.reload.admin_id).to be_nil
  end
end
