# app/controllers/contractor_import_controller.rb
class ContractorImportController < ApplicationController
  skip_before_action :authenticate_user! # or equivalent
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
