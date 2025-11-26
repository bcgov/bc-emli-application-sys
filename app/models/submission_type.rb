class SubmissionType < PermitClassification
  has_many :submission_variants,
           class_name: "SubmissionVariant",
           foreign_key: :parent_id,
           dependent: :restrict_with_error
end
