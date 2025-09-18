class Contractor < ApplicationRecord
  belongs_to :contact, class_name: "User", optional: true

  has_many :contractor_onboards, dependent: :destroy
  has_many :contractor_employees, dependent: :destroy
  has_many :employees, through: :contractor_employees, source: :employee
  has_many :permit_applications, as: :submitter
  has_many :license_agreements,
           class_name: "UserLicenseAgreement",
           as: :account,
           dependent: :destroy

  validates :business_name, presence: true
end
