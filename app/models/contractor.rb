class Contractor < ApplicationRecord
  searchkick(
    callbacks: false,
    searchable: %i[id business_name contact_name contact_email],
    word_middle: %i[business_name contact_name contact_email]
  )

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

  def search_data
    {
      id: id,
      business_name: business_name,
      contact_name: contact&.name,
      contact_email: contact&.email,
      contact_id: contact&.id,
      created_at: created_at,
      updated_at: updated_at
    }
  end

  def name
    business_name.presence || contact&.name
  end

  def email
    contact&.email
  end

  def contact_name
    contact&.name
  end
end
