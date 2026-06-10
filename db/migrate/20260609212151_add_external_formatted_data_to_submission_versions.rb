class AddExternalFormattedDataToSubmissionVersions < ActiveRecord::Migration[8.1]
  def change
    add_column :submission_versions, :external_formatted_data, :jsonb
  end
end
