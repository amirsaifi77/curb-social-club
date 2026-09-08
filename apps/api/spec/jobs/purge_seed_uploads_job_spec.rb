require "rails_helper"

# docs/specs/admin.md Risks: A07 uploads are working files, purged after a day.
RSpec.describe PurgeSeedUploadsJob, type: :job do
  def upload(created_at:, marked: true)
    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new("slug,name\n"), filename: "seeds.csv", content_type: "text/csv",
      metadata: marked ? { seed_upload: true } : {}
    )
    blob.update_columns(created_at: created_at)
    blob
  end

  it "purges a marked upload older than a day and leaves everything else" do
    old = upload(created_at: 2.days.ago)
    fresh = upload(created_at: 1.hour.ago)
    other = upload(created_at: 2.days.ago, marked: false)

    # purge_later queues the delete, so only the fresh and unmarked blobs
    # are provably untouched here; the old one goes when the queue runs.
    expect { described_class.perform_now }
      .to have_enqueued_job(ActiveStorage::PurgeJob).with(old).exactly(:once)

    perform_enqueued_jobs
    expect(ActiveStorage::Blob.exists?(old.id)).to be(false)
    expect(described_class.uploads.pluck(:id)).to contain_exactly(fresh.id)
    expect(ActiveStorage::Blob.exists?(other.id)).to be(true)
  end

  it "keeps a marked blob that something ended up attached to, and drops the marker" do
    blob = upload(created_at: 2.days.ago)
    club = create(:club)
    club.avatar.attach(blob)

    expect { described_class.perform_now }.not_to have_enqueued_job(ActiveStorage::PurgeJob)
    expect(ActiveStorage::Blob.exists?(blob.id)).to be(true)
    expect(described_class.uploads.count).to eq(0)
  end
end
