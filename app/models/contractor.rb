class Contractor < ApplicationRecord
  searchkick(
    callbacks: false,
    searchable: %i[id business_name contact_name contact_email number],
    word_middle: %i[business_name contact_name contact_email number]
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

  has_one :contractor_info, dependent: :destroy
  accepts_nested_attributes_for :contractor_info

  validates :business_name, presence: true

  # Delegate status fields to latest contractor_onboard record
  def latest_onboard
    contractor_onboards.order(created_at: :desc).first
  end

  def suspended_at
    latest_onboard&.suspended_at
  end

  def suspended_reason
    latest_onboard&.suspended_reason
  end

  def suspended?
    suspended_at.present?
  end

  def deactivated_at
    latest_onboard&.deactivated_at
  end

  def deactivated_reason
    latest_onboard&.deactivated_reason
  end

  def deactivated?
    deactivated_at.present?
  end

  before_validation :assign_unique_number, on: :create

  def search_data
    {
      id: id,
      business_name: business_name,
      contact_name: contact&.name,
      contact_email: contact&.email,
      contact_id: contact&.id,
      created_at: created_at,
      updated_at: updated_at,
      number: number,
      suspended_at: suspended_at,
      deactivated_at: deactivated_at
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

  private

  def assign_unique_number
    return self.number unless self.number.blank?

    # Get the highest existing contractor number (as an integer)
    last_number =
      Contractor
        .order(Arel.sql("LENGTH(number) DESC"), number: :desc)
        .limit(1)
        .pluck(:number)
        .first

    if last_number.present?
      new_integer = last_number.to_i + 1
    else
      new_integer = 1
    end

    # Pad to 5 characters, no dashes
    new_number = format("%05d", new_integer)

    self.number = new_number
  end
end
