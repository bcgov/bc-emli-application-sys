FactoryBot.define do
  factory :contractor do
    sequence(:business_name) { |n| "Contractor #{n}" }
    # contact_id must be the submitter of whatever invoice is under test -
    # invoice_submission_recipients resolves the contractor through it.
    contact_id { nil }
  end
end
