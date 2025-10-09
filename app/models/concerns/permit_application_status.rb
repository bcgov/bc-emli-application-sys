# app/models/concerns/permit_application_status.rb
module PermitApplicationStatus
  extend ActiveSupport::Concern

  FLOW_MAP = {
    %w[application participant external] =>
      ApplicationFlow::ApplicationExternalParticipant,
    %w[application participant internal] =>
      ApplicationFlow::ApplicationExternalParticipant,
    %w[support_request participant internal] =>
      ApplicationFlow::SupportRequestInternalParticipant,
    %w[onboarding contractor external] =>
      ApplicationFlow::OnboardingExternalContractor,
    %w[invoice contractor external] =>
      ApplicationFlow::InvoiceExternalContractor
  }.freeze

  included do
    after_initialize :set_flow
    after_update :check_ineligible_transition

    # Let model calls (like application.submit?) proxy to the flow
    delegate_missing_to :flow

    AASM_EVENTS = %i[
      submit
      review
      approve
      reject
      finalize_revision_requests
      cancel_revision_requests
    ].freeze

    AASM_EVENTS.each do |event|
      define_method("#{event}!") do
        flow.public_send("#{event}!") if flow.respond_to?("#{event}!")
      end
      define_method("may_#{event}?") do
        flow.public_send("may_#{event}?") if flow.respond_to?("may_#{event}?")
      end
    end
  end

  def flow
    @flow ||= set_flow
    @flow
  end

  private

  def set_flow
    key = [submission_type&.code, user_group_type&.code, audience_type&.code]
    klass = FLOW_MAP[key] || ApplicationFlow::Default
    klass.new(self)
  end

  def check_ineligible_transition
    if saved_change_to_status? && status_previously_was != "ineligible" &&
         status == "ineligible"
      flow.handle_ineligible_status
    end
  end
end
