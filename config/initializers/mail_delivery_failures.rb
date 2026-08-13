# Fail queued mail once, log it, and discard rather than letting Sidekiq retry for
# ~21 days. Every CHES rejection we have actually seen is permanent - a malformed
# message or bad address fails identically however many times it is resent.
#
# This deliberately discards transient responses (429/5xx) too. A CHES outage fails
# the health check in ChesEmailDelivery#deliver! before we ever get here and raises
# a plain error, which Sidekiq does retry; and if CHES is down, a queued invite is
# not the thing anyone will notice first.
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
