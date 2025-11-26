class SubmissionVariant < PermitClassification
  belongs_to :submission_type,
             class_name: "SubmissionType",
             foreign_key: :parent_id,
             inverse_of: :submission_variants

  validates :submission_type, presence: true
end
