class SubmissionStatusEvent < ApplicationRecord
  # Staged inbound status events. The raw body lives in `payload` - see the
  # migration for why it is not split into typed columns.
  #
  # Rows are the durable input to status processing, not a log of it: ingest
  # writes them, the processor reads them and stamps `processed_at` + `outcome`.
  #
  # `unmatched` is distinct from `skipped` and `failed`: there was no submission
  # to transition at all, so we neither chose not to act nor were refused. It is
  # also the only outcome nobody outside can see, since the sender got a 200.
  OUTCOMES = %w[applied skipped failed unmatched].freeze

  # Optional on purpose - we record events for submission numbers we cannot
  # match, rather than rejecting them.
  belongs_to :permit_application, optional: true

  # Optional so a revoked or deleted key never takes the event history with it.
  belongs_to :external_api_key, optional: true

  validates :event_id, presence: true, uniqueness: true
  validates :outcome, inclusion: { in: OUTCOMES }, allow_nil: true

  scope :unprocessed, -> { where(processed_at: nil) }

  # Both are terminal, since nothing reprocesses.
  scope :needing_attention, -> { where(outcome: %w[failed unmatched]) }

  # No `include Auditable` - this table is itself the history.
end
