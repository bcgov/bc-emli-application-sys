FactoryBot.define do
  factory :program do
    sequence(:program_name) { |n| "Program #{n}" }
    funded_by { "Test Funder" }
    external_api_state { "g_off" }
  end
end
