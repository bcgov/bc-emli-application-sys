class ContractorImport < ApplicationRecord
  scope :email_not_sent, -> { where(invite_email_sent_at: nil) }
  scope :email_sent, -> { where.not(invite_email_sent_at: nil) }
  scope :not_consumed, -> { where(consumed_at: nil) }

  def invite_email_sent?
    invite_email_sent_at.present?
  end

  def invite!
    raise "Invite already sent" if invite_email_sent?
    raise "Invite already consumed" if consumed?

    self.class.transaction do
      PermitHubMailer.contractor_invite(self)&.deliver_later
      update!(invite_email_sent_at: Time.current)
    end
  end

  def invite_reminder!
    raise "Invite already consumed" if consumed?
    self.class.transaction do
      Rails.logger.info(
        "Attempting to send contractor invite reminder email for import #{self.id}"
      )
      PermitHubMailer.contractor_invite_reminder(self)&.deliver_later
      update!(invite_email_sent_at: Time.current) unless invite_email_sent?
    end
  end

  def email
    payload.dig("username")
  end

  def first_name
    payload.dig("contacts", "primary", "first_name")
  end

  def last_name
    payload.dig("contacts", "primary", "last_name")
  end

  def business_name
    payload.dig("business", "name")
  end

  def summary
    {
      invite_code: invite_code,
      business_name: business_name,
      primary_contact: payload.dig("contacts", "primary"),
      username: email
    }
  end

  def consumed?
    consumed_at.present?
  end

  def consume!(user:, contractor:)
    update!(
      consumed_at: Time.current,
      consumed_by_user_id: user.id,
      contractor_id: contractor.id
    )
  end
end
