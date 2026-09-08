module Admin
  module Events
    # A04's dates (docs/specs/admin.md R-17). A hand-edited row is an
    # override: overridden_at is stamped so the materializer leaves it alone
    # (events R-13), and reset hands the date back to the rule.
    class OccurrencesController < BaseController
      WINDOW_BACK = 30.days
      WINDOW_AHEAD = 90.days
      CANCEL_NOTE_ERROR = "Say why this date is off. People who were going see it.".freeze

      before_action :load_event
      before_action :load_occurrence, only: %i[edit update cancel reset]

      def index
        load_index
      end

      def edit; end

      # R-13: an admin-added date is an override from birth, so the nightly
      # materializer never removes it, and announced events accept rows.
      def create
        @new_occurrence = @event.occurrences.new(occurrence_params.merge(overridden_at: Time.current))
        @new_occurrence.starts_at = local_time(params.dig(:event_occurrence, :starts_at_local))
        if @new_occurrence.save
          audit("occurrence_create", target: @event,
                changes: { "occurrence_id" => @new_occurrence.id, "starts_at" => @new_occurrence.starts_at.iso8601 })
          redirect_to admin_event_occurrences_path(@event), notice: "Date added."
        else
          load_index
          render :index, status: :unprocessable_content
        end
      end

      def update
        @occurrence.assign_attributes(occurrence_params.merge(overridden_at: Time.current))
        @occurrence.starts_at = local_time(params.dig(:event_occurrence, :starts_at_local)) || @occurrence.starts_at
        @occurrence.ends_at = local_time(params.dig(:event_occurrence, :ends_at_local)) || @occurrence.ends_at
        changes = changeset(@occurrence)
        if @occurrence.save
          audit("occurrence_update", target: @event, changes: changes.merge("occurrence_id" => @occurrence.id))
          redirect_to admin_event_occurrences_path(@event), notice: "Date saved."
        else
          render :edit, status: :unprocessable_content
        end
      end

      # A cancellation people can read: the note is required here even though
      # the column is optional, because it is shown to everyone going.
      def cancel
        note = params[:override_note].to_s.strip
        @occurrence.errors.add(:override_note, CANCEL_NOTE_ERROR) if note.blank?

        # update, not update!: a note over the model's limit belongs in the
        # same inline error as a missing one, not on an exception page.
        saved = note.present? && @occurrence.update(status: "cancelled", override_note: note, overridden_at: Time.current)
        unless saved
          load_index
          @cancel_error_id = @occurrence.id
          return render :index, status: :unprocessable_content
        end

        audit("occurrence_cancel", target: @event, changes: { "occurrence_id" => @occurrence.id, "override_note" => note })
        redirect_to admin_event_occurrences_path(@event), notice: "Date cancelled."
      end

      # Hands the date back to the rule: the override is cleared, then the
      # materializer decides whether the date exists at all.
      def reset
        @occurrence.update!(overridden_at: nil, override_note: nil)
        MaterializeOccurrencesJob.perform_later(@event.id)
        audit("occurrence_reset", target: @event, changes: { "occurrence_id" => @occurrence.id })
        redirect_to admin_event_occurrences_path(@event), notice: "Override cleared. Rebuilding from the rule."
      end

      private

      def load_event
        @event = Event.find(params[:event_id])
      end

      def load_occurrence
        @occurrence = @event.occurrences.find(params[:id])
      end

      # Everything the index template needs, wherever it is rendered from.
      # The add form gets its own record so a rejected cancel does not
      # pre-fill it with the failing date's note.
      def load_index
        @occurrences = window_rows
        @new_occurrence ||= EventOccurrence.new(event: @event)
      end

      def window_rows
        @event.occurrences.where(starts_at: (Time.current - WINDOW_BACK)..(Time.current + WINDOW_AHEAD))
              .chronological.to_a
      end

      def local_time(value)
        return nil if value.blank?

        ActiveSupport::TimeZone[@event.timezone]&.parse(value.to_s)
      end

      def occurrence_params
        params.expect(event_occurrence: %i[status override_note])
      end

      def changeset(occurrence)
        occurrence.changes.transform_values { |before, after| { "before" => before.to_s, "after" => after.to_s } }
      end
    end
  end
end
