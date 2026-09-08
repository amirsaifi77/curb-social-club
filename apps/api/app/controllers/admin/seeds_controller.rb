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

    def show; end

    # Dry run: the report says what would happen and nothing is written.
    def create
      @kind = kind_param
      blob = store(params[:file])
      return render :show, status: :unprocessable_content if blob.nil?

      @blob_id = blob.signed_id
      @report = run(blob, dry_run: true)
      render :preview
    end

    def apply
      @kind = kind_param
      blob = ActiveStorage::Blob.find_signed(params[:blob_id])
      return redirect_to admin_seeds_path, alert: "That upload is gone. Upload the file again." if blob.nil?

      @report = run(blob, dry_run: false)
      audit("import_csv", changes: { "kind" => @kind, "filename" => blob.filename.to_s }.merge(@report.counts.transform_keys(&:to_s)))
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
                                             content_type: "text/csv", metadata: { seed_upload: true })
    end

    # A file over the row limit is the one error that stops the run, so it
    # is caught here rather than reported per row.
    def run(blob, dry_run:)
      blob.open { |file| IMPORTERS.fetch(@kind).call(file, dry_run: dry_run) }
    rescue Seeds::BaseImporter::TooManyRows => error
      @too_many = error.message
      nil
    end
  end
end
