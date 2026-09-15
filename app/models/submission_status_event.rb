class SubmissionStatusEvent < ApplicationRecord
  # Staged inbound status events. The raw body lives in `payload` - see the
  # migration for why it is not split into typed columns.
  #
  # "Submission" rather than "application": the same feed carries invoices and
  # contractor onboarding forms, not just participant applications.
  #
  # Rows are the durable input to status processing, not a log of it: ingest
  # writes them, the processor reads them and stamps `processed_at` + `outcome`.
  OUTCOMES = %w[applied skipped failed].freeze

  # Optional on purpose - we record events for submission numbers we cannot
  # match, rather than rejecting them.
  belongs_to :permit_application, optional: true

  # Which integration sent it. Optional so a revoked or deleted key never
  # takes the event history with it.
  belongs_to :external_api_key, optional: true

  validates :event_id, presence: true, uniqueness: true
  validates :outcome, inclusion: { in: OUTCOMES }, allow_nil: true

  scope :unprocessed, -> { where(processed_at: nil) }

  # No `include Auditable` - this table is itself the history.
end
