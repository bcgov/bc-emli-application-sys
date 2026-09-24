class AddDecidedAtToPermitApplications < ActiveRecord::Migration[8.1]
  # When the CRM decided the outcome. Sourced from the status event's
  # eventDatetime - see StatusEventProcessor#record_decision_date.
  #
  # Nullable, no backfill: every existing row predates the CRM connection.
  def change
    add_column :permit_applications, :decided_at, :datetime
  end
end
