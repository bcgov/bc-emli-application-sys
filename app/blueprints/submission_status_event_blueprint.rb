class SubmissionStatusEventBlueprint < Blueprinter::Base
  # The ingest acknowledgement - thin by design. camelCase to match the request
  # body (see the controller); eventId rather than applicationId because only it
  # is one-to-one with the request.
  view :external_api do
    identifier :event_id, name: :eventId

    # Derived - permit_application_id is the matched flag.
    field :matched do |event, _options|
      event.permit_application_id.present?
    end

    # Only on a miss. We never return a 4xx for an unrecognised reference, so
    # this is the sender's one signal that something did not line up.
    field :submission_number,
          name: :applicationId,
          if: ->(_field, event, _options) { event.permit_application_id.blank? }
  end
end
