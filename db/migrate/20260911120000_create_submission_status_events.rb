class CreateSubmissionStatusEvents < ActiveRecord::Migration[8.1]
  # Staging table for inbound status events. Ingest writes the
  # body verbatim and never touches submission status; a separate processor
  # reads unprocessed rows and drives the existing state machine.
  #
  # No typed columns for event_type / approved_date / income_bracket etc - the
  # processor reads those out of `payload`, so extraction can change once we
  # have seen real traffic without another migration or a backfill.
  def change
    create_table :submission_status_events, id: :uuid do |t|
      # The sender's event id. String rather than uuid on purpose: a malformed id
      # would otherwise raise on insert and lose the payload with it.
      t.string :event_id, null: false
      t.jsonb :payload, null: false

      # The reference as it was sent, named to match the payload field.
      # NOT permit_application_id below - this is what we were asked to find,
      # that is what we found, and the gap between them is the only diagnostic
      # an unmatched event leaves.
      t.string :application_id

      # Nullable: an event naming a submission we do not have is still recorded.
      t.references :permit_application,
                   null: true,
                   foreign_key: true,
                   type: :uuid,
                   index: false

      # Which integration sent it - the key's id, never its token. Cannot be
      # reconstructed later, which is why it is captured up front. Nullable, and
      # ExternalApiKey has_many ... dependent: :nullify, or the FK would refuse
      # to let a key with events be deleted.
      t.references :external_api_key,
                   null: true,
                   foreign_key: true,
                   type: :uuid,
                   index: false

      t.datetime :processed_at
      t.string :outcome
      t.text :outcome_detail

      # created_at is the received-at time; the row is inserted the moment the
      # request lands, so a separate column would always duplicate it.
      t.timestamps
    end

    # Idempotency: a sender re-POSTs with a stable event_id when a reply is
    # lost, and this turns the duplicate into a no-op rather than a second row.
    add_index :submission_status_events, :event_id, unique: true

    add_index :submission_status_events, %i[permit_application_id created_at]

    # How a human comes at this table, especially for unmatched rows where the
    # permit_application FK is nil.
    add_index :submission_status_events, :application_id

    add_index :submission_status_events, :external_api_key_id

    # The work queue. Unprocessed rows stay a small fraction of the table, so a
    # partial index keeps the scan cheap.
    add_index :submission_status_events,
              :processed_at,
              where: "processed_at IS NULL",
              name: "index_submission_status_events_unprocessed"
  end
end
