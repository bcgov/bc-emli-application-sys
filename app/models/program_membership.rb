class ProgramMembership < ApplicationRecord
  belongs_to :user
  belongs_to :program

  has_many :program_classification_memberships, dependent: :destroy

  scope :active, -> { where(deactivated_at: nil) }
  scope :inactive, -> { where.not(deactivated_at: nil) }

  def deactivate!
    update!(deactivated_at: Time.current)
  end

  def active?
    deactivated_at.nil?
  end
end
