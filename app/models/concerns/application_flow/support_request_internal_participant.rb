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

      data = application.submission_data

      application_number =
        data["data"]
          &.values
          &.map do |section|
            section.find { |k, _| k.include?("application_number") }&.last
          end
          &.compact
          &.first

      Rails.logger.info(
        "Linked parent application number: #{application_number}"
      )

      return unless application_number.present?

      parent_application = PermitApplication.find_by(number: application_number)
      unless parent_application
        Rails.logger.warn(
          "No parent application found for number #{application_number}"
        )
        return
      end

      requested_by_user =
        if application.submitter.is_a?(User)
          application.submitter
        elsif application.submitter_id.present?
          User.find_by(id: application.submitter_id)
        end

      unless requested_by_user
        Rails.logger.warn(
          "Could not resolve submitter user for #{application.id}"
        )
        return
      end

      SupportRequest.create!(
        parent_application: parent_application,
        requested_by: requested_by_user, # user instance
        linked_application: application,
        additional_text: ""
      )

      Rails.logger.info(
        "Created support request linking #{application.id} (#{application.number}) " \
          "to parent #{parent_application.id} (#{parent_application.number}) " \
          "requested_by=#{requested_by_user.id}"
      )
    end
  end
end
