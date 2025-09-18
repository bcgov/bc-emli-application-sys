class Api::EndUserLicenseAgreementController < Api::ApplicationController
  skip_after_action :verify_policy_scoped
  skip_before_action :require_confirmation
  skip_before_action :authenticate_user!, only: [:index]

  def index
    # endpoint that works for both authenticated and non-authenticated users
    variant =
      if user_signed_in?
        authorize :end_user_license_agreement, :index?
        current_user.eula_variant
      else
        # Default to 'contractor terms' for public access (contractors)
        "contractor"
      end

    render_success EndUserLicenseAgreement.active_agreement(variant)
  end
end
