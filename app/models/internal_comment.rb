class InternalComment < ApplicationRecord
  # Audits create/delete to AuditLog (who + what + when). Comments are not editable, so the
  # update hook never fires. Added once comments became deletable so removals leave a trail.
  include Auditable

  belongs_to :permit_application, counter_cache: :internal_comments_count
  belongs_to :user

  validates :body, presence: true, length: { maximum: 5000 }
  validate :user_must_be_review_staff

  private

  # Internal comments may only be authored by review staff (admin / admin_manager).
  # Mirrors RevisionRequest#user_must_be_review_staff.
  def user_must_be_review_staff
    unless user&.review_staff?
      errors.add(
        :user,
        I18n.t(
          "activerecord.errors.models.internal_comment.attributes.user.incorrect_role"
        )
      )
    end
  end
end
