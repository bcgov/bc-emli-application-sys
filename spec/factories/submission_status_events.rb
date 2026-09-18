FactoryBot.define do
  factory :submission_status_event do
    sequence(:event_id) { |n| "evt-#{n}-#{SecureRandom.hex(4)}" }
    payload { { "eventId" => event_id } }
  end
end
