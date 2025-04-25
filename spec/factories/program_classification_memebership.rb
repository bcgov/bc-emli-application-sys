FactoryBot.define do
  factory :program_classification_membership do
    program_membership
    user_group_type { association :user_group_type }
    submission_type { nil }
  end
end
