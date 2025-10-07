# app/models/concerns/permit_application_status.rb
module PermitApplicationStatus
  extend ActiveSupport::Concern

  # add additional flows as needed for new application types
  FLOW_MAP = {
    %w[application participant external] =>
      ApplicationFlow::ApplicationExternalParticipant,
    %w[support_request participant external] =>
      ApplicationFlow::SupportRequestInternalParticipant
  }.freeze

  included do
    after_initialize :set_flow
    after_update :check_ineligible_transition

    def flow
      @flow ||= set_flow
    end
  end

  private

  def set_flow
    key = [submission_type&.name, user_group_type&.name, audience_type&.name]
    klass = FLOW_MAP[key] || ApplicationFlow::Default
    @flow = klass.new(self)
  end

  def check_ineligible_transition
    if saved_change_to_status? && status_previously_was != "ineligible" &&
         status == "ineligible"
      flow.handle_ineligible_status
    end
  end
end
