class PermitApplicationPolicy < ApplicationPolicy
  # Policy controls whether user can view this permit application
  # Used for: search results, individual record access, list filtering
  def index?
    return true if user.system_admin? || user.admin_manager? || user.admin?

    # Hide internal draft support requests from participants
    # These are created by admin on behalf of participant and should only be visible after submission
    if record.submission_type&.code == "support_request" &&
         record.audience_type&.code == "internal" && record.new_draft?
      return false
    end

    # polymorphic submitter check
    case record.submitter
    when User
      # submitted directly by a user
      record.submitter == user || record.submitted_for == user.id
    when Contractor
      # submitted by a contractor — allow if the user is that contractor's contact
      record.submitter.contact_id == user.id
    else
      false
    end
  end

  def show?
    index?
  end

  def create?
    # Check if contractor (company) is suspended or deactivated
    if record.submitter_type == Contractor.name
      contractor = record.submitter
      return false if contractor&.suspended? || contractor&.deactivated?
    end

    # Check if user is an employee of a suspended or deactivated contractor
    if user.contractor?
      user_contractor = user.contractor_employees.first&.contractor
      if user_contractor&.suspended? || user_contractor&.deactivated?
        return false
      end
    end

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

  def request_supporting_files?
    user.admin_manager? || user.admin?
  end

  # Default hook for support requests – subclasses/services must override!
  def support_requests?
    false
  end

  def contractor_onboarding?
    user.contractor?
    #TODO: we'll likely need to check that the user isn't already associated with a Contractor company
  end

  def upload_supporting_document?
    case record.status
    when "new_draft"
      # Submitter or admin (same program) can upload during creation
      is_admin_in_program =
        (user.admin_manager? || user.admin?) &&
          user.program_memberships.active.exists?(program_id: record.program_id)
      record.submitter == user || is_admin_in_program
    when "newly_submitted", "resubmitted"
      # Admin editing phase: submitter OR admin (same program) can upload
      is_admin_in_program =
        (user.admin_manager? || user.admin?) &&
          user.program_memberships.active.exists?(program_id: record.program_id)
      record.submitter == user || is_admin_in_program
    when "revisions_requested"
      # Upload permissions based on chosen pathway
      performed_by =
        record.latest_submission_version&.revision_requests&.first&.performed_by

      if performed_by == "staff"
        # Admin "on behalf": admin (same program) can upload
        is_admin_in_program =
          (user.admin_manager? || user.admin?) &&
            user.program_memberships.active.exists?(
              program_id: record.program_id
            )
        is_admin_in_program
      elsif performed_by == "applicant"
        # "Send to submitter": only participant can upload
        record.submitter == user
      else
        # Fallback: only submitter
        record.submitter == user
      end
    else
      # No uploads for other states
      false
    end
  end

  def destroy?
    # Submitters can withdraw their own draft applications
    # Admins can withdraw draft support requests
    is_submitter = record.submitter == user && record.draft?
    is_admin_withdrawing_support_request =
      (user.admin_manager? || user.admin?) &&
        record.submission_type&.code == "support_request" && record.draft?

    is_submitter || is_admin_withdrawing_support_request
  end

  def submit?
    if record.revisions_requested?
      # Revisions requested state (Save Edits workflow):
      # Allow original submitter OR admin users from same program (for "on behalf" submissions)
      is_submitter = record.submitter == user
      is_admin = user.admin_manager? || user.admin?
      is_admin_in_program =
        is_admin &&
          user.program_memberships.active.exists?(program_id: record.program_id)
      is_submitter || is_admin_in_program
    elsif record.draft?
      # Draft applications: Only users with full submission permissions can submit
      permissions =
        record.submission_requirement_block_edit_permissions(user_id: user.id)

      # Allow admin/admin_manager to submit support request applications
      is_support_request = record.submission_type&.code == "support_request"
      is_admin = user.admin_manager? || user.admin?

      permissions == :all || (is_support_request && is_admin)
    else
      # All other states: Only admin users can submit
      user.admin_manager? || user.admin?
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
