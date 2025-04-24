class ProgramClassificationMembership < ApplicationRecord
  belongs_to :user
  belongs_to :program
  belongs_to :user_group_type, class_name: "PermitClassification"
  belongs_to :submission_type,
             class_name: "PermitClassification",
             optional: true

  scope :active, -> { where(deactivated_at: nil) }
  scope :inactive, -> { where.not(deactivated_at: nil) }

  validates :user_group_type, presence: true
  validates :user, :program, presence: true

  validate :correct_classification_types

  def deactivate!
    update!(deactivated_at: Time.current)
  end

  def active?
    deactivated_at.nil?
  end

  def correct_classification_types
    if user_group_type&.type != "UserGroupType"
      errors.add(
        :user_group_type,
        "must be a valid UserGroupType classification"
      )
    end

    if submission_type && submission_type.type != "SubmissionType"
      errors.add(
        :submission_type,
        "must be a valid SubmissionType classification"
      )
    end
  end
end
