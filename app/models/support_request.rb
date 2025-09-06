class SupportRequest < ApplicationRecord
  belongs_to :parent_application, class_name: "PermitApplication"
  belongs_to :requested_by, class_name: "User"
  belongs_to :linked_application,
             class_name: "PermitApplication",
             optional: true
end
