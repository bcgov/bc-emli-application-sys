class PermitApplicationPolicy < ApplicationPolicy
  # All user types can use the search permit application
  def index?
    if user.system_admin? || record.submitter == user || user.admin_manager? ||
         user.admin?
      # record.collaborator?(user_id: user.id, collaboration_type: :submission)
      true
    end
  end

  def show?
    index?
  end

  def create?
    true
  end

  def mark_as_viewed?
    user.review_staff?
  end

  def change_status?
    user.admin_manager? || user.admin?
  end

  def update?
    return true if user.admin_manager?
    if record.draft?
      record.submission_requirement_block_edit_permissions(
        user_id: user.id
      ).present?
    else
      user.review_staff? && user.jurisdictions.find(record.jurisdiction_id)
    end
  end

  def update_version?
    permit_application = record
    designated_submitter =
      permit_application.users_by_collaboration_options(
        collaboration_type: :submission,
        collaborator_type: :delegatee
      ).first

    record.draft? && (record.submitter == user || designated_submitter == user)
  end

  def update_revision_requests?
    user.admin_manager? || user.admin?
  end

  def remove_revision_requests?
    user.admin_manager? || user.admin?
  end

  def upload_supporting_document?
    record.draft? && record.submitter == user
  end

  def destroy?
    # Submitters can only destroy their own draft applications
    record.submitter == user && record.draft?
  end

  def submit?
    #TODO: this is where we handle who can submit what, this needs to be re-worked
    # to allow admins/psr's the ability to submit in place of a Partiticipant
    Rails.logger.info("#{user.inspect}")
    record.draft? ? record.submitter == user : user.admin_manager?
    if record.draft?
      record.submission_requirement_block_edit_permissions(user_id: user.id) ==
        :all
    else
      user.admin_manager? || user.participant? # user.jurisdictions.find(record.jurisdiction_id)
    end
  end

  def generate_missing_pdfs?
    user.system_admin? || (user.participant? && record.submitter == user) ||
      ((user.admin_manager? || user.admin?))
  end

  def finalize_revision_requests?
    user.admin_manager? || user.admin?
  end

  def create_permit_collaboration?
    permit_collaboration = record

    if permit_collaboration.submission?
      permit_collaboration.permit_application.submitter == user &&
        permit_collaboration.permit_application.draft?
    elsif permit_collaboration.review?
      (user.review_staff?) &&
        user
          .jurisdictions
          .find_by(id: permit_collaboration.permit_application.jurisdiction_id)
          .present? && permit_collaboration.permit_application.submitted?
    else
      false
    end
  end

  def remove_collaborator_collaborations?
    permit_application = record

    if permit_application.draft?
      permit_application.submitter_id == user.id
    else
      user.review_staff? &&
        user.jurisdictions.find(permit_application.jurisdiction_id)
    end
  end

  def invite_new_collaborator?
    permit_collaboration = record

    # New collaborators (i.e new user in the system) can only be invited for submission collaborations
    return false if permit_collaboration.review?

    permit_collaboration.permit_application.submitter == user &&
      permit_collaboration.permit_application.draft?
  end

  def create_or_update_permit_block_status?
    permit_block_status = record

    if permit_block_status.submission?
      block_permissions =
        permit_block_status.permit_application.submission_requirement_block_edit_permissions(
          user_id: user.id
        )

      permit_block_status.permit_application.draft? &&
        block_permissions.present? &&
        (
          block_permissions == :all ||
            block_permissions.include?(permit_block_status.requirement_block_id)
        )
    elsif permit_block_status.review?
      (user.review_staff?) &&
        user
          .jurisdictions
          .find_by(id: permit_block_status.permit_application.jurisdiction_id)
          .present? && permit_block_status.permit_application.submitted?
    else
      false
    end
  end

  def download_application_metrics_csv?
    user.super_admin?
  end

  # we may want to separate an admin update to a secondary policy

  class Scope < Scope
    def resolve
      scope.where(submitter: user, sandbox: sandbox)
    end
  end
end
