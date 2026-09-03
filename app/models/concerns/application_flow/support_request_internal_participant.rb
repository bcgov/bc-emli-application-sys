# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class SupportRequestInternalParticipant < Base
    aasm column: :status, enum: true, autosave: true do
      # sub-classed states
      state :new_draft, initial: true
      state :newly_submitted
      state :revisions_requested
      state :resubmitted
      state :in_review
      state :approved
      state :ineligible

      # Overridden sumbit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end
    end

    def handle_submission
      application.update!(signed_off_at: Time.current)

      # The SupportRequest linking this upload form to the participant's application already exists -
      # SupportingFilesService creates it when the admin picks a pathway. Use it rather than digging
      # an "application_number" key out of submission_data, which this used to do (BCHEP-496).
      #
      # That lookup depended on the template carrying such a field and on an admin typing it
      # correctly. Absent, it returned nil and this method bailed here, sending the participant
      # nothing; present, a typo matching another application would have notified the wrong person.
      # The SupportRequest link is authoritative and untypeable.
      support_request =
        SupportRequest.find_by(linked_application_id: application.id)
      parent_application = support_request&.parent_application
      return unless parent_application

      requested_by_user = support_request.requested_by

      # Notify the participant that supporting files have been added to their application. The
      # uploaded files live on this support-request submission, not on the parent application the
      # notification is about, so resolve them here and pass them through - same shape as the
      # controller passing missing_files on the request pathway.
      NotificationService.publish_supporting_files_added_by_admin_event(
        parent_application,
        admin_user: requested_by_user,
        # active_ rather than the bare association: supporting_documents rows are not destroyed
        # when a file is removed from the form, so an admin who uploads the wrong file, removes it
        # and uploads another would have both listed in the participant's email. active_ filters to
        # what the submission data actually references (form_supporting_documents.rb).
        uploaded_files:
          application.active_supporting_documents.map(&:file_name).compact,
        linked_application_id: application.id
      )
    end
  end
end
