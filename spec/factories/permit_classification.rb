FactoryBot.define do
  factory :activity, class: "Activity" do
    sequence(:name) { |n| "Activity Name #{n}" }
    code { :low_residential }
  end

  factory :permit_type, class: "PermitType" do
    sequence(:name) { |n| "Permit Type Name #{n}" }
    code { :new_construction }
  end

  factory :user_group_type, class: "UserGroupType" do
    sequence(:name) { |n| "User Group #{n}" }
    enabled { true }
    code { :participant } # override as needed
  end

  factory :submission_type, class: "SubmissionType" do
    sequence(:name) { |n| "Submission Type #{n}" }
    enabled { true }
    code { :application } # override as needed
  end
end
