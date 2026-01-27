class ContractorOnboard < ApplicationRecord
  belongs_to :contractor
  belongs_to :onboard_application,
             class_name: "PermitApplication",
             foreign_key: :onboard_application_id
  belongs_to :suspended_by,
             class_name: "User",
             foreign_key: :suspended_by,
             optional: true
  belongs_to :deactivated_by,
             class_name: "User",
             foreign_key: :deactivated_by,
             optional: true

  validates :contractor_id, :onboard_application_id, presence: true
end
