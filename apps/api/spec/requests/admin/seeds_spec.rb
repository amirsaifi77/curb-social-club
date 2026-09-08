require "rails_helper"

# docs/specs/admin.md R-20, R-21, AC-12, AC-13.
RSpec.describe "admin seed import", type: :request do
  let(:admin) { create(:user, role: "admin") }

  def fixture(name) = Rails.root.join("spec/fixtures/seeds/#{name}")
  def upload(name) = Rack::Test::UploadedFile.new(fixture(name), "text/csv")
  def blob_id = Nokogiri::HTML(response.body).at("input[name=blob_id]")["value"]
  def preview_rows = Nokogiri::HTML(response.body).css("table.list tbody tr").map(&:text)

  it "AC-4: a moderator is bounced from A07 with the role flash" do
    sign_in_moderator(create(:user, role: "moderator"))
    get "/admin/seeds"
    expect(response).to redirect_to("/admin")
  end

  context "when signed in as an admin" do
    before do
      sign_in_admin(admin)
      create(:app_account)
    end

    it "AC-12: previews without writing, applies the same blob, and skips on a re-upload" do
      # Sponsors first, then clubs, then the events that name them.
      post "/admin/seeds", params: { kind: "sponsors", file: upload("sponsors_2.csv") }
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Preview: 2 to create, 0 to update, 0 unchanged, 0 errors. Nothing has been written.")
      expect(Sponsor.count).to eq(0)

      post "/admin/seeds/apply", params: { kind: "sponsors", blob_id: blob_id }
      expect(response.body).to include("Applied. 2 created, 0 updated, 0 unchanged.")
      expect(Sponsor.count).to eq(2)

      post "/admin/seeds", params: { kind: "clubs", file: upload("clubs_3.csv") }
      expect(response.body).to include("Preview: 3 to create")
      post "/admin/seeds/apply", params: { kind: "clubs", blob_id: blob_id }
      expect(Club.count).to eq(3)

      post "/admin/seeds", params: { kind: "events", file: upload("events_12_fixed.csv") }
      expect(response.body).to include("Preview: 12 to create")
      expect(Event.count).to eq(0)
      post "/admin/seeds/apply", params: { kind: "events", blob_id: blob_id }
      expect(Event.count).to eq(12)

      # Re-uploading each file is all skip and applies nothing.
      { "sponsors" => "sponsors_2.csv", "clubs" => "clubs_3.csv", "events" => "events_12_fixed.csv" }.each do |kind, file|
        post "/admin/seeds", params: { kind: kind, file: upload(file) }
        expect(response.body).to include("0 to create, 0 to update"), kind
      end
      expect([ Sponsor.count, Club.count, Event.count ]).to eq([ 2, 3, 12 ])
    end

    it "AC-12: refuses a file over 500 rows with the copy, on preview and on apply" do
      oversized = Rack::Test::UploadedFile.new(oversized_events_csv.path, "text/csv")
      post "/admin/seeds", params: { kind: "events", file: oversized }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("Files are limited to 500 rows. Split the file.")
      expect(response.body).not_to include("Apply")
      expect(Event.count).to eq(0)

      # The page offers no Apply for an unusable file, so a crafted one is
      # posted straight at the stored blob: it says the same thing rather
      # than raising on a report that was never built.
      post "/admin/seeds/apply", params: { blob_id: ActiveStorage::Blob.order(:created_at).last.signed_id }
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("Files are limited to 500 rows.")
      expect(Event.count).to eq(0)
    end

    it "AC-13: a bad rrule is an error row, excluded from the Apply count, and apply writes the rest" do
      post "/admin/seeds", params: { kind: "events", file: upload("events_bad_rrule.csv") }

      expect(response.body).to include("Preview: 1 to create, 0 to update, 0 unchanged, 1 errors.")
      expect(response.body).to have_button("Apply 1 change")
      expect(preview_rows.join).to include(Recurrence::RruleValidator::MESSAGE)

      post "/admin/seeds/apply", params: { kind: "events", blob_id: blob_id }
      expect(Event.count).to eq(1)
      expect(Event.first.slug).to eq("lido-saturday")
    end

    it "audits the apply with the counts, and stores the upload as a purgeable blob" do
      post "/admin/seeds", params: { kind: "sponsors", file: upload("sponsors_2.csv") }
      post "/admin/seeds/apply", params: { kind: "sponsors", blob_id: blob_id }

      audit = AdminAudit.where(action: "import_csv").sole
      expect(audit.changeset).to include("kind" => "sponsors", "filename" => "sponsors_2.csv", "create" => 2)
      expect(PurgeSeedUploadsJob.uploads.count).to eq(1)
    end

    it "reads a spreadsheet export: a byte order mark and an accented venue name" do
      lines = File.readlines(fixture("events_12_fixed.csv"))
      file = Tempfile.new([ "events", ".csv" ])
      file.binmode
      file.write("\xEF\xBB\xBF".b + (lines[0] + lines[1].sub("Lido Marina Village", "Café Lido")).b)
      file.flush

      post "/admin/seeds", params: { kind: "events", file: Rack::Test::UploadedFile.new(file.path, "text/csv") }

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Preview: 1 to create")
      post "/admin/seeds/apply", params: { blob_id: blob_id }
      expect(Venue.sole.name).to eq("Café Lido")
    end

    it "says the file is unreadable rather than raising on a malformed quote" do
      file = Tempfile.new([ "events", ".csv" ])
      file.write(File.readlines(fixture("events_12_fixed.csv"))[0] + %(a,"unclosed\n))
      file.flush

      post "/admin/seeds", params: { kind: "events", file: Rack::Test::UploadedFile.new(file.path, "text/csv") }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("not readable as CSV")
    end

    it "refuses a signed id for a blob this screen never made" do
      other = ActiveStorage::Blob.create_and_upload!(io: StringIO.new("slug,name\n"), filename: "elsewhere.csv",
                                                     content_type: "text/csv")

      post "/admin/seeds/apply", params: { blob_id: other.signed_id }

      expect(response).to redirect_to("/admin/seeds")
      follow_redirect!
      expect(flash_text).to include("That upload is gone.")
      expect(AdminAudit.where(action: "import_csv")).not_to exist
    end

    it "applies the kind the preview used, not one the form was made to send" do
      post "/admin/seeds", params: { kind: "sponsors", file: upload("sponsors_2.csv") }
      post "/admin/seeds/apply", params: { kind: "events", blob_id: blob_id }

      expect(Sponsor.count).to eq(2)
      expect(AdminAudit.where(action: "import_csv").sole.changeset["kind"]).to eq("sponsors")
    end

    it "asks for a file rather than raising when none was chosen" do
      post "/admin/seeds", params: { kind: "events" }
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("Choose a CSV file.")
    end

    it "says so when the blob behind an Apply is gone" do
      post "/admin/seeds/apply", params: { kind: "events", blob_id: "not-a-signed-id" }
      expect(response).to redirect_to("/admin/seeds")
      follow_redirect!
      expect(flash_text).to include("That upload is gone.")
    end
  end
end
