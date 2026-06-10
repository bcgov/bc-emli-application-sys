class DenormalizeSubmittedAtOnPermitApplications < ActiveRecord::Migration[8.1]
  def up
    add_column :permit_applications, :submitted_at, :datetime

    # Backfill from the earliest submission version per application.
    # submitted_at is the first submission date and never changes on resubmit.
    execute <<~SQL
      UPDATE permit_applications pa
      SET submitted_at = sv.earliest_created_at
      FROM (
        SELECT permit_application_id, MIN(created_at) AS earliest_created_at
        FROM submission_versions
        GROUP BY permit_application_id
      ) sv
      WHERE pa.id = sv.permit_application_id
    SQL
  end

  def down
    remove_column :permit_applications, :submitted_at
  end
end
