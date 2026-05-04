class ContractorIncompleteDraftNotificationJob
  include Sidekiq::Worker
  sidekiq_options queue: :default

  def perform(permit_application_id)
    permit_application = PermitApplication.find_by(id: permit_application_id)

    return unless permit_application
    return unless permit_application.status == "new_draft"
    return unless permit_application.submitter
    return if permit_application.submitter.discarded?

    permit_application.process_contractor_invoice_draft_reminder!
  end
end
