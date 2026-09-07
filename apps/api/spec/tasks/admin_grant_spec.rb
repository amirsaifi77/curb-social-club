require "rails_helper"
require "rake"

# docs/specs/admin.md R-10: the first admin comes from the rake task.
RSpec.describe "admin:grant", type: :task do
  before(:all) { Rails.application.load_tasks if Rake::Task.tasks.empty? } # rubocop:disable RSpec/BeforeAfterAll

  after { Rake::Task["admin:grant"].reenable }

  it "sets the role by email, case-insensitively, and audits it" do
    user = create(:user, email: "amir@example.com")
    expect { Rake::Task["admin:grant"].invoke("Amir@Example.com") }.to output(/is now admin/).to_stdout
    expect(user.reload.role).to eq("admin")
    audit = AdminAudit.where(action: "grant_role").sole
    expect(audit).to have_attributes(admin_id: nil, target_id: user.id)
    expect(audit.changeset["role"]).to eq("admin")
  end

  it "accepts moderator and refuses unknown roles and emails" do
    user = create(:user, email: "mod@example.com")
    expect { Rake::Task["admin:grant"].invoke("mod@example.com", "moderator") }.to output(/is now moderator/).to_stdout
    expect(user.reload.role).to eq("moderator")
    Rake::Task["admin:grant"].reenable
    expect { Rake::Task["admin:grant"].invoke("mod@example.com", "owner") }
      .to raise_error(SystemExit).and output(/Role must be one of/).to_stderr
    Rake::Task["admin:grant"].reenable
    expect { Rake::Task["admin:grant"].invoke("nobody@example.com") }
      .to raise_error(SystemExit).and output(/No user with email/).to_stderr
  end

  it "refuses a user who is not active" do
    user = create(:user, :suspended, email: "gone@example.com")
    expect { Rake::Task["admin:grant"].invoke("gone@example.com") }
      .to raise_error(SystemExit).and output(/only an active user/).to_stderr
    expect(user.reload.role).to eq("member")
  end
end
