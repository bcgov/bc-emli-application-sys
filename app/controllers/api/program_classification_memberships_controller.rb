class Api::ProgramClassificationMembershipsController < ApplicationController
  before_action :set_program

  def membership_exists
    program_membership = find_or_create_membership

    exists =
      program_membership&.program_classification_memberships&.exists?(
        user_group_type_id: user_group_type_id(params[:user_group_type].to_sym),
        submission_type_id: submission_type_id_or_nil(params[:submission_type])
      )

    render json: { exists: exists || false }
  end

  def create
    program_membership =
      ProgramMembership.find_or_create_by!(
        user_id: params[:user_id],
        program_id: @program.id
      )

    membership =
      ProgramClassificationMembership.new(
        program_membership: program_membership,
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

  def sync
    program_membership = find_or_create_membership

    # Normalize incoming
    incoming =
      params[:classifications]
        .map do |c|
          {
            user_group_type_id: user_group_type_id(c[:user_group_type].to_sym),
            submission_type_id: submission_type_id_or_nil(c[:submission_type])
          }
        end
        .to_set

    # Current classifications
    existing =
      program_membership
        .program_classification_memberships
        .map do |m|
          {
            user_group_type_id: m.user_group_type_id,
            submission_type_id: m.submission_type_id
          }
        end
        .to_set

    # Add new
    (incoming - existing).each do |c|
      program_membership.program_classification_memberships.create!(c)
    end

    # Remove stale
    (existing - incoming).each do |c|
      program_membership.program_classification_memberships.where(c).destroy_all
    end

    render json:
             ProgramClassificationMembershipBlueprint.render(
               program_membership.program_classification_memberships.reload,
               view: :default
             )
  end

  def destroy
    membership = ProgramClassificationMembership.find(params[:id])
    membership.destroy
    head :no_content
  end

  private

  def find_or_create_membership
    ProgramMembership.find_or_create_by!(
      user_id: params[:user_id],
      program_id: @program.id
    )
  end

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
    return nil if code.blank?

    submission_type_id(code)
  end
end
