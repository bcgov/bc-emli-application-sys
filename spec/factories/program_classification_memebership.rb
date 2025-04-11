FactoryBot.define do
  factory :program_classification_membership do
    association :user
    association :program
    association :user_group_type, factory: :user_group_type
    submission_type { nil }

    trait :with_submission_type do
      association :submission_type, factory: :submission_type
    end
  end
end
