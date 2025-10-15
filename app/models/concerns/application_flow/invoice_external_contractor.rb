# app/models/concerns/application_flow/default.rb
module ApplicationFlow
  class InvoiceExternalContractor < Base
    aasm do
      # Override submit
      event :submit do
        transitions from: :new_draft,
                    to: :newly_submitted,
                    after: :handle_submission
      end
    end

    def handle_submission
      # TODO:
      application.update(signed_off_at: Time.current)
    end
  end
end
