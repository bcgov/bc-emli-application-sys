class AddApplicationSubmissionNoticeToSiteConfigurations < ActiveRecord::Migration[
  7.1
]
  # Blank is the column default; the notice text is seed data, not schema.
  # We backfill the existing SiteConfiguration row here (rather than in a
  # separate db/data migration) so the paragraph appears on deploy even if the
  # pipeline does not run data migrations.
  NOTICE =
    "Due to the high volume of applications we are receiving, review and response times may be longer than usual. Applications are processed on a first come first serve basis. Estimated timelines for review are currently 45-60 days. Please be assured we will review your application as soon as we can."

  def up
    add_column :site_configurations, :application_submission_notice, :text

    execute(<<~SQL.squish)
      UPDATE site_configurations
      SET application_submission_notice = #{connection.quote(NOTICE)}
    SQL
  end

  def down
    remove_column :site_configurations, :application_submission_notice
  end
end
