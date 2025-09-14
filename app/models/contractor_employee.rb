# app/models/contractor_employee.rb
class ContractorEmployee < ApplicationRecord
  belongs_to :contractor
  belongs_to :employee, class_name: "User"

  validates :contractor_id, uniqueness: { scope: :employee_id }
end
