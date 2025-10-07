# app/models/concerns/application_flow/application_external_participant.rb
module ApplicationFlow
  class ApplicationExternalParticipant < Base
    aasm do
      event :review do
        transitions from: :newly_submitted, to: :in_review
      end

      event :approve do
        transitions from: :in_review, to: :approved
      end

      event :reject do
        transitions from: :in_review,
                    to: :ineligible,
                    after: :handle_ineligible_status
      end
    end
  end
end
