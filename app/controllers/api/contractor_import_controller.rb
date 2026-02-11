# app/controllers/contractor_import_controller.rb
# This controller handles the API endpoints for validating and consuming contractor import invites,
# which are used to onboard contractors into the system based on data imported from an external source. The main actions are:
# - show: validates the invite token and returns appropriate responses based on whether the invite is valid, consumed, or not found.
# - pending: checks if there is a pending invite in the session and returns its status.
# - validate: an endpoint to validate the invite token without consuming it, used for client-side validation before attempting to create a contractor.
# - create: consumes the invite token, creates a new contractor record, builds the onboarding application with the imported data, and marks the invite as consumed.
class Api::ContractorImportController < Api::ApplicationController
  skip_before_action :authenticate_user!, only: [:validate]
  skip_after_action :verify_authorized, only: %i[validate create]
  before_action :load_invite

  # the show action is used when a contractor clicks on their invite link. It checks if the invite is valid and not consumed,
  # and if so, it stores the invite code in the session for later use during the onboarding process.
  # If the invite is invalid or consumed, it returns appropriate error responses.
  def show
    invite = ContractorImport.find_by!(invite_code: params[:token])
    raise ActionController::Gone if invite.consumed?

    session[:contractor_invite_code] = invite.invite_code

    head :ok
  end

  # the pending action is used to check if there is a pending invite in the session. This can be used by the frontend to determine
  # if the user has an invite that they can use to start the onboarding process.
  def pending
    code = session[:contractor_invite_code]

    if code.present?
      invite = ContractorImport.find_by(invite_code: code)
      if invite && !invite.consumed?
        render json: { hasInvite: true }
        return
      end
    end

    render json: { hasInvite: false }
  end

  # the validate action is used for client-side validation of the invite token before attempting to create a contractor.
  # It checks if the invite exists and is not consumed, and returns appropriate responses.
  def validate
    invite = ContractorImport.find_by(invite_code: params[:token])

    if invite.nil?
      render json: { valid: false, reason: "not_found" }, status: :not_found
      return
    end

    if invite.consumed?
      render json: { valid: false, reason: "consumed" }, status: :gone
      return
    end

    render json: { valid: true }, status: :ok
  end

  # the create action is responsible for consuming the invite token, creating a new contractor record, building the onboarding application with the imported data, and marking the invite as consumed. It performs several steps:
  # 1. It checks if the invite exists and is not consumed. If it is invalid, it returns an error response.
  # 2. It extracts the payload from the invite, which contains the imported data for the contractor.
  # 3. It creates a new Contractor record using the data from the invite.
  # 4. It builds a new ContractorOnboarding application for the contractor.
  # 5. It maps the imported data to the structure needed for the onboarding application submission and updates the application with this data.
  # 6. It marks the invite as consumed, linking it to the created contractor and user.
  def create
    invite = ContractorImport.find_by(invite_code: params[:token])

    # we need to check if the invite exists and is not consumed before we can create the contractor
    #  this check was done in validate but we want to make sure we check again here in case there was a delay between that validation and creation
    if invite.nil? || invite.consumed?
      render json: {
               success: false,
               message: "Invalid or already consumed invite code"
             },
             status: :unprocessable_entity
      return
    end

    # Here we create the contractor based on the invite and any additional data provided in params
    invite_data = invite.payload || {}

    contractor_params = {
      contact_id: current_user.id,
      business_name: invite_data.dig("business", "name"),
      website: invite_data.dig("business", "website"),
      phone_number: invite_data.dig("business", "phone_number"),
      onboarded: false
    }
    ActiveRecord::Base.transaction do
      contractor = Contractor.create(contractor_params)
      Rails.logger.info(
        "Created contractor with ID #{contractor.id} for invite data #{invite_data}"
      )

      program = Program.find_by!(slug: "energy-savings-program")

      # Create the Contractor Onboarding
      onboarding_form =
        PermitApplication::ContractorOnboarding.new(
          program: program,
          contractor: contractor,
          user_context: pundit_user
        ).call

      # Build submission data from invite payload
      answers =
        ContractorImports::OnboardingAnswerMapper.new(
          import_data: invite_data
        ).call

      submission_data =
        ContractorImports::BuildSubmissionJson.new(
          answers_by_section: answers
        ).call

      # Build contractor onboard record, linking the contractor and application
      ContractorOnboard.new(
        contractor_id: contractor.id,
        onboard_application_id: onboarding_form.id
      ).save!

      onboarding_form.update!(
        submission_data: submission_data,
        status: :approved
      )

      Rails.logger.info(
        "Created ContractorOnboard application ID #{onboarding_form.id}"
      )

      # Mark the invite as consumed
      invite.consume!(user: current_user, contractor: contractor)
    end

    render json: {
             success: true,
             message: "Contractor imported successfully"
           },
           status: :ok
  end

  private

  # the load_invite method is a before_action that loads the invite based on the token provided in the params.
  # It checks if the invite exists and if it has already been consumed. If the invite is not found, it returns a 404 response.
  # If the invite has already been consumed, it returns a 410 Gone response. This method ensures that the subsequent actions have a valid invite to work with.
  def load_invite
    @invite = ContractorImport.find_by(invite_code: params[:token])

    if @invite.nil?
      render :not_found, status: :not_found
      return
    end

    if @invite.consumed?
      render :already_claimed, status: :gone
      return
    end
  end
end
