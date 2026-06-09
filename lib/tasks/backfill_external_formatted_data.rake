# Backfills SubmissionVersion#external_formatted_data — the external-API precompute
# cache (see ExternalPermitApplicationService#formatted_submission_data_for_external_use).
#
# Only the LATEST submission version per application is ever served by the external
# API, so only those are populated. New versions self-populate via the after_create
# callback, and reads fall back to live formatting on a miss — so this backfill is a
# one-time pre-warm, safe to run anytime.
#
# Run order on deploy: migrate (adds the column) -> deploy code -> run this task.
#
# Usage:
#   rake external_api:backfill_formatted_data            # populate only NULL rows (resumable)
#   FORCE=true rake external_api:backfill_formatted_data # recompute all (after a formatting change)
namespace :external_api do
  desc "Backfill external_formatted_data on latest submission versions (FORCE=true to overwrite)"
  task backfill_formatted_data: :environment do
    force = ENV["FORCE"] == "true"
    scope = PermitApplication.joins(:submission_versions).distinct
    total = scope.count
    populated = 0
    skipped = 0
    errors = 0
    started = Time.current

    puts "[backfill_formatted_data] #{total} applications with versions (force=#{force})"

    scope.find_each(batch_size: 500) do |pa|
      sv = pa.latest_submission_version
      next unless sv

      if !force && !sv[:external_formatted_data].nil?
        skipped += 1
        next
      end

      begin
        sv.update_column(
          :external_formatted_data,
          ExternalPermitApplicationService.new(pa)
            .formatted_submission_data_for_external_use
        )
        populated += 1
      rescue => e
        errors += 1
        warn "  ERROR pa=#{pa.id} (#{pa.number}): #{e.class}: #{e.message}"
      end

      if ((populated + skipped) % 1000).zero?
        puts "  ...#{populated + skipped}/#{total} processed"
      end
    end

    puts "[backfill_formatted_data] done in #{(Time.current - started).round(1)}s — " \
           "populated=#{populated} skipped=#{skipped} errors=#{errors}"
  end
end
