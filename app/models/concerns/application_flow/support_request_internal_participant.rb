# app/models/concerns/application_flow/support_request_internal_participant.rb
module ApplicationFlow
  class SupportRequestInternalParticipant < Base
    aasm do
      # Override submit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_support_request_submission
      end

      def handle_support_request_submission
        update(signed_off_at: Time.current)

        submission_versions.create!(
          form_json: form_json,
          submission_data: submission_data
        )

        # zip_and_upload_supporting_documents
        # TODO: upload files to parent application

        send_submit_notifications
      end
    end
  end
end
