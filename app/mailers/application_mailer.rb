class ApplicationMailer < ActionMailer::Base
  # An empty-but-present FROM_EMAIL yields a blank From header, which CHES rejects
  # with 422. Fall back so notification mail can't be dropped that way.
  default from: ENV["FROM_EMAIL"].presence || "no-reply@gov.bc.ca"
  layout "mailer"

  protected

  # template_key should match i18n as well as the name of the file in the views
  def send_mail(
    email:,
    template_key:,
    subject_i18n_params: {},
    include_subject_start: true
  )
    @root_url = FrontendUrlHelper.root_url

    subject_key =
      I18n.t(
        "application_mailer.subjects.#{template_key}",
        **subject_i18n_params
      )
    subject =
      (
        if include_subject_start
          "#{I18n.t("application_mailer.subject_start")} - #{subject_key}"
        else
          subject_key
        end
      )

    mail(
      to: email,
      subject:,
      template_name: template_key # this isn't fully necessary since rails introspects it anyway, but here for clarity (template_path is also auto introspected by rails)
    )
  end
end
