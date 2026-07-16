FactoryBot.define do
  factory :application_assignment do
    user
    association :permit_application
  end
end
