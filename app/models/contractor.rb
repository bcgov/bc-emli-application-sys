class Contractor < ApplicationRecord
  belongs_to :contact, class_name: "User"

  has_many :contractor_onboards, dependent: :destroy
  has_many :contractor_employees, dependent: :destroy
  has_many :employees, through: :contractor_employees, source: :employee
  has_many :permit_applications, as: :submitter

  validates :business_name, presence: true
end
