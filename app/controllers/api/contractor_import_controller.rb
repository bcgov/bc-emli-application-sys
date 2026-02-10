# app/controllers/contractor_import_controller.rb
class Api::ContractorImportController < Api::ApplicationController
  skip_before_action :authenticate_user!, only: [:validate]
  skip_after_action :verify_authorized, only: %i[validate create]
  before_action :load_invite

  def show
    invite = ContractorImport.find_by!(invite_code: params[:token])
    raise ActionController::Gone if invite.consumed?

    session[:contractor_invite_code] = invite.invite_code

    head :ok
  end

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

    contractor = Contractor.create(contractor_params)
    Rails.logger.info(
      "Created contractor with ID #{contractor.id} for invite data #{invite_data}"
    )

    program = Program.find_by!(slug: "energy-savings-program")
    # Create the Permit Aplication (Contractor Onboarding type)
    onboarding_form =
      PermitApplication::ContractorOnboarding.new(
        program: program,
        contractor: contractor,
        user_context: pundit_user
      ).call

    # Build contractor onboard record, linking the contractor and application
    onboard =
      ContractorOnboard.new(
        contractor_id: contractor.id,
        onboard_application_id: onboarding_form.id
      ).save!

    Rails.logger.info(
      "Created ContractorOnboard application ID #{onboarding_form.id}"
    )

    # Mark the invite as consumed
    invite.consume!(user: current_user, contractor: contractor)

    render json: {
             success: true,
             message: "Contractor imported successfully"
           },
           status: :ok
  end

  private

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
