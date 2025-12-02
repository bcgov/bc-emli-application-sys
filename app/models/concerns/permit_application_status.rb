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
    %w[support_request participant external] =>
      ApplicationFlow::SupportRequestExternalParticipant,
    %w[onboarding contractor external] =>
      ApplicationFlow::OnboardingExternalContractor,
    %w[onboarding contractor internal] =>
      ApplicationFlow::OnboardingExternalContractor,
    %w[invoice contractor external] =>
      ApplicationFlow::InvoiceExternalContractor,
    %w[invoice contractor internal] =>
      ApplicationFlow::InvoiceExternalContractor,
    %w[application contractor internal] =>
      ApplicationFlow::InvoiceExternalContractor
  }.freeze

  included do
    after_initialize :set_flow
    after_update :check_ineligible_transition
    after_save :reset_flow_if_status_changed

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
    if @flow && @flow.aasm.current_state.to_s != status
      Rails.logger.warn "Flow desync detected for #{id}: flow=#{@flow.aasm.current_state}, status=#{status}"
      @flow = set_flow
    end
    @flow ||= set_flow
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

  def reset_flow_if_status_changed
    @flow = set_flow if saved_change_to_status?
  end
end
