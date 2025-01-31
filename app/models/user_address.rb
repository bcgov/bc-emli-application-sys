class UserAddress < ApplicationRecord
  belongs_to :user

  enum address_type: { physical: 'physical', mailing: 'mailing' }, _prefix: true

  validates :street_address, :locality, :region, :postal_code, :country, presence: true
  validates :address_type, presence: true
  validate :only_one_address_per_type  # Enforce one address per type
  
  after_save :enforce_unique_address_type  # Ensure only one address per type

  private

  # Ensure a user can only have one address per type
  def only_one_address_per_type
    if address_type_physical? && user.physical_address && user.physical_address.id != id
      errors.add(:base, :one_physical)
    end

    if address_type_mailing? && user.mailing_address && user.mailing_address.id != id
      errors.add(:base, :one_mailing)
    end
  end

  # After save, remove any duplicate addresses of the same type
  def enforce_unique_address_type
    if address_type_physical?
      user.physical_address&.destroy if user.physical_address && user.physical_address.id != id
    elsif address_type_mailing?
      user.mailing_address&.destroy if user.mailing_address && user.mailing_address.id != id
    end
  end
end
