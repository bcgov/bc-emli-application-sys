class SubmissionStatusEventBlueprint < Blueprinter::Base
  # The ingest acknowledgement. Intentionally thin: the sender needs to know we
  # took the event and whether we recognised the submission, nothing more.
  #
  # event_id rather than application_id or order_id, because it is the only
  # field that is one-to-one with the request. The other two identify the
  # submission, which many events share, so neither would tell the sender which
  # POST is being acknowledged.
  view :external_api do
    identifier :event_id

    # Derived rather than stored - permit_application_id is the matched flag.
    field :matched do |event, _options|
      event.permit_application_id.present?
    end

    # Only on a miss, and only to confirm what we parsed. Since we deliberately
    # never return a 4xx for an unrecognised reference, this is the sole signal
    # the sender gets that something did not line up - and it catches the
    # field-mapping mistakes (wrong source field, stray whitespace) that
    # would otherwise look identical to a submission we simply do not have.
    field :application_id,
          if: ->(_field, event, _options) { event.permit_application_id.blank? }
  end
end
