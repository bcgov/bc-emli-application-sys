class TemplatePublishJob
  include Sidekiq::Worker

  def perform
    # Added logging to track job execution
    Rails.logger.info "[TemplatePublishJob] Starting template publishing job at #{Time.current}"

    publishable_versions =
      TemplateVersioningService.get_versions_publishable_now
    Rails.logger.info "[TemplatePublishJob] Found #{publishable_versions.count} versions ready to publish"

    if publishable_versions.any?
      publishable_versions.each do |version|
        Rails.logger.info "[TemplatePublishJob] Publishing version #{version.id} for template #{version.requirement_template.id}"
      end

      TemplateVersioningService.publish_versions_publishable_now!
      Rails.logger.info "[TemplatePublishJob] Successfully published #{publishable_versions.count} template versions"
    else
      Rails.logger.info "[TemplatePublishJob] No template versions ready for publishing"
    end
  rescue => e
    Rails.logger.error "[TemplatePublishJob] Error during template publishing: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise e
  end
end
