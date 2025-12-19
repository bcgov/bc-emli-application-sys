class PermitClassification < ApplicationRecord
  # This class will have a 'type' column for STI.
  self.inheritance_column = :type

  belongs_to :parent, class_name: "PermitClassification", optional: true
  has_many :children,
           class_name: "PermitClassification",
           foreign_key: :parent_id,
           dependent: :nullify

  validates :code, presence: true, uniqueness: :true
  validates :name, presence: true

  scope :enabled, -> { where(enabled: true) }

  enum code: %i[
         low_residential
         medium_residential
         high_residential
         new_construction
         addition_alteration_renovation
         site_alteration
         demolition
         internal
         external
         participant
         contractor
         application
         onboarding
         support_request
         invoice
         invoice_heat_pump_space
         invoice_heat_pump_water
         invoice_insulation
         invoice_windows_doors
         invoice_ventilation
         invoice_electrical_upgrade
         invoice_health_safety
       ]

  def image_url
    ActionController::Base.helpers.asset_path(
      "images/permit_classifications/#{self.code}.png"
    )
  end
end
