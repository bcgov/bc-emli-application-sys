class ContractorOnboard < ApplicationRecord
  belongs_to :contractor
  belongs_to :onboard_application, class_name: "PermitApplication"

  validates :contractor_id, :onboard_application_id, presence: true
end
