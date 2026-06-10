class AddSummaryFilterIndexesToPermitApplications < ActiveRecord::Migration[8.1]
  # The external API /applications/summary endpoint orders by submitted_at and
  # filters on submitted_at and screened_in_at. Without indexes these degrade to
  # full table scans + filesort as the table grows — index them.
  def change
    add_index :permit_applications, :submitted_at, if_not_exists: true
    add_index :permit_applications, :screened_in_at, if_not_exists: true
  end
end
