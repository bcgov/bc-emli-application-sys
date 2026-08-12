# CHES rejections are permanent (malformed message, bad address), not transient, so
# retrying wastes queue capacity and delivers nothing. Fail the job once, log it, and
# discard rather than letting Sidekiq retry for ~21 days.
#
# User-facing sends (confirmation instructions) are delivered inline and surface the
# failure to the user in Api::UsersController; this only governs queued mail.
Rails.application.config.after_initialize do
  ActionMailer::MailDeliveryJob.discard_on ChesEmailDelivery::DeliveryError do |job, error|
    mailer, action = job.arguments.first(2)
    Rails.logger.error(
      "[CHES] Discarded #{mailer}##{action} after delivery failure: #{error.message}"
    )
  end
end
