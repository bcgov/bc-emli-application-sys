class ProgramClassificationMembershipsController < ApplicationController
  before_action :set_program

  def participant_inbox_memberships
    memberships =
      ProgramClassificationMembership
        .where(program: @program)
        .where(user_group_type_id: user_group_type_id(:participant))
        .where(submission_type_id: nil)

    render json: ProgramClassificationMembershipBlueprint.render(memberships)
  end

  def contractor_inbox_memberships
    onboarding_type_id = submission_type_id(:onboarding)

    memberships =
      ProgramClassificationMembership
        .where(program: @program)
        .where(user_group_type_id: user_group_type_id(:contractor))
        .where(submission_type_id: nil)

    # Exclude onboarding if needed here (optional depending on use case)
    render json: ProgramClassificationMembershipBlueprint.render(memberships)
  end

  def contractor_onboarding_memberships
    memberships =
      ProgramClassificationMembership
        .where(program: @program)
        .where(user_group_type_id: user_group_type_id(:contractor))
        .where(submission_type_id: submission_type_id(:onboarding))

    render json: ProgramClassificationMembershipBlueprint.render(memberships)
  end

  def inbox_membership_exists
    membership =
      ProgramClassificationMembership.find_by(
        user_id: params[:user_id],
        program_id: @program.id,
        user_group_type_id: user_group_type_id(params[:user_group_type].to_sym),
        submission_type_id: submission_type_id_or_nil(params[:submission_type])
      )

    render json: { exists: membership.present? }
  end

  def create
    membership =
      ProgramClassificationMembership.new(
        user_id: params[:user_id],
        program_id: @program.id,
        user_group_type_id: user_group_type_id(params[:user_group_type].to_sym),
        submission_type_id: submission_type_id_or_nil(params[:submission_type])
      )

    if membership.save
      render json: ProgramClassificationMembershipBlueprint.render(membership),
             status: :created
    else
      render json: {
               errors: membership.errors.full_messages
             },
             status: :unprocessable_entity
    end
  end

  def destroy
    membership =
      ProgramClassificationMembership.find_by!(
        user_id: params[:user_id],
        program_id: @program.id,
        user_group_type_id: user_group_type_id(params[:user_group_type].to_sym),
        submission_type_id: submission_type_id_or_nil(params[:submission_type])
      )

    membership.destroy
    head :no_content
  end

  private

  def set_program
    @program = Program.find(params[:program_id])
  end

  def user_group_type_id(code)
    PermitClassification.find_by!(
      code: PermitClassification.codes[code],
      type: "UserGroupType"
    ).id
  end

  def submission_type_id(code)
    PermitClassification.find_by!(
      code: PermitClassification.codes[code],
      type: "SubmissionType"
    ).id
  end

  def submission_type_id_or_nil(code)
    code.present? ? submission_type_id(code.to_sym) : nil
  end
end
