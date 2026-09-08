module Admin
  # A07 CSV seed import (docs/specs/admin.md R-20, R-21). Upload once,
  # preview, then apply the same blob by its signed id, so Apply runs the
  # file the preview described rather than whatever was uploaded second.
  class SeedsController < BaseController
    KINDS = %w[venues clubs sponsors events].freeze
    IMPORTERS = {
      "venues" => Seeds::VenueRowImporter, "clubs" => Seeds::ClubRowImporter,
      "sponsors" => Seeds::SponsorRowImporter, "events" => Seeds::EventRowImporter
    }.freeze
    GONE = "That upload is gone. Upload the file again.".freeze

    def show
      @kind = kind_param
    end

    # Dry run: the report says what would happen and nothing is written.
    def create
      @kind = kind_param
      blob = store(params[:file])
      return render :show, status: :unprocessable_content if blob.nil?

      @blob_id = blob.signed_id
      @report = run(blob)
      render :preview, status: @problem ? :unprocessable_content : :ok
    end

    def apply
      blob = seed_upload(params[:blob_id])
      return redirect_to admin_seeds_path, alert: GONE if blob.nil?

      # The kind travels with the blob, so Apply cannot run a different
      # importer than the preview the admin read.
      @kind = blob.metadata["seed_kind"]
      @report = run(blob, dry_run: false)
      return render :results, status: :unprocessable_content if @problem

      audit("import_csv", changes: { "kind" => @kind, "filename" => blob.filename.to_s }
        .merge(@report.counts.transform_keys(&:to_s)))
      render :results
    end

    private

    def kind_param
      params[:kind].to_s.presence_in(KINDS) || "events"
    end

    def store(file)
      if file.blank?
        flash.now[:alert] = "Choose a CSV file."
        return nil
      end

      ActiveStorage::Blob.create_and_upload!(io: file.tempfile, filename: file.original_filename,
                                             content_type: "text/csv",
                                             metadata: { seed_upload: true, seed_kind: @kind })
    end

    # Signed is not enough: the id has to name a blob this screen created,
    # or any signed id in the app would be a way to write to the database.
    def seed_upload(signed_id)
      blob = ActiveStorage::Blob.find_signed(signed_id)
      blob if blob&.metadata&.dig("seed_upload") && KINDS.include?(blob.metadata["seed_kind"])
    end

    # A file that cannot be read at all is the admin's problem to fix, not a
    # stack trace: the row limit and a malformed or non-UTF-8 file both land
    # on the page they came from.
    def run(blob, dry_run: true)
      blob.open { |file| IMPORTERS.fetch(@kind).call(file, dry_run: dry_run) }
    rescue Seeds::BaseImporter::TooManyRows, Seeds::BaseImporter::Unreadable => error
      @problem = error.message
      nil
    end
  end
end
