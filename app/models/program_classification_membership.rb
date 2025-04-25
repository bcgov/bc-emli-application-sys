class ProgramClassificationMembership < ApplicationRecord
  belongs_to :program_membership
  belongs_to :user_group_type, class_name: "PermitClassification"
  belongs_to :submission_type,
             class_name: "PermitClassification",
             optional: true

  # Convenience access to user and program through program_membership
  delegate :user, :program, to: :program_membership

  # Required relationships
  validates :program_membership, :user_group_type, presence: true

  # Custom classification validation
  validate :correct_classification_types

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
