class ContractorStatusEvent < ApplicationRecord
  # "remove" (not "deactivate") mirrors the frontend's wording for the
  # deactivate action (handleRemove / contractor.removed).
  EVENT_TYPES = %w[suspend unsuspend remove].freeze

  belongs_to :contractor
  belongs_to :contractor_onboard
  belongs_to :performed_by, class_name: "User", optional: true

  # This is a faithful recorder of what happened - it never gates a status
  # change. "reason required" is enforced where the rule lives: the frontend
  # suspend/remove reason pages. (A blank reason here would mean something
  # genuinely got suspended without one - we'd want to record that, not reject
  # it.)
  validates :event_type, presence: true, inclusion: { in: EVENT_TYPES }
end
