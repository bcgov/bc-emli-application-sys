class SupportRequest < ApplicationRecord
  belongs_to :parent_application,
             class_name: "PermitApplication",
             inverse_of: :support_requests

  belongs_to :requested_by, class_name: "User"

  belongs_to :linked_application,
             class_name: "PermitApplication",
             inverse_of: false

  validate :parent_cannot_be_child

  def parent_cannot_be_child
    if parent_application_id == linked_application_id
      errors.add(
        :parent_application_id,
        "cannot be the same as the linked application"
      )
    end

    if SupportRequest.exists?(linked_application_id: parent_application_id)
      errors.add(
        :parent_application_id,
        "Cannot be a child of another support request"
      )
    end
  end
end
