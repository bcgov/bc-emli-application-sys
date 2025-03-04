FactoryBot.define do
  factory :jurisdiction_membership do
    association :user, factory: :user, role: "admin_manager"
    association :jurisdiction, factory: :sub_district
  end
end
