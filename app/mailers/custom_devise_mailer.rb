class CustomDeviseMailer < Devise::Mailer
  # This is now the only source of the From header (see devise_mail below), and an
  # empty-but-present FROM_EMAIL is truthy, so it would sail through Devise's check
  # and produce the same blank From that CHES rejects with 422.
  default from: ENV["FROM_EMAIL"].presence || "no-reply@gov.bc.ca"
  layout "mailer"

  # If you wanted to override devise confirmation instructions do it here
  def confirmation_instructions(record, token, opts = {})
    @change_type = record.email.present? ? "changed" : "created"
    @user = record
    super
  end

  def invitation_instructions(record, token, opts = {})
    @token = token
    @user = record

    # Check if this is a contractor employee invitation
    if opts[:contractor_name].present?
      @contractor_name = opts[:contractor_name]
      @program_id = opts[:program_id]
      @root_url = FrontendUrlHelper.root_url

      devise_mail(record, :contractor_employee_invitation_instructions, opts)
    else
      # Original program invitation
      @program_id = opts[:program_id]
      @role_text = opts[:role_text]
      devise_mail(record, :invitation_instructions, opts)
    end
  end

  def devise_mail(record, action, opts = {}, &block)
    initialize_from_record(record)
    mail_headers = headers_for(action, opts)
    @root_url = FrontendUrlHelper.root_url

    # Do NOT pass `from:` here. Devise's headers_for deliberately omits :from when the
    # mailer defines `default from:` (see Devise::Mailers::Helpers), so mail_headers[:from]
    # is nil and passing it explicitly overrides the default with a blank From.
    mail(
      to: mail_headers[:to],
      subject:
        "#{I18n.t("application_mailer.subject_start")} - #{mail_headers[:subject]}",
      template_path: "devise/mailer",
      template_name: mail_headers[:template_name]
    )
  end
end
