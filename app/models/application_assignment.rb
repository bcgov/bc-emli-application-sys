class ApplicationAssignment < ApplicationRecord
  include Auditable

  belongs_to :user
  belongs_to :permit_application

  validates :user_id, uniqueness: { scope: :permit_application_id }

  after_commit :reindex_permit_application, on: %i[create destroy]

  private

  # user_id here is WHICH REVIEWER got assigned - genuine domain data, not
  # an actor stamp - so don't strip it from the audit trail like the
  # Auditable default assumes. See Auditable#audit_excluded_columns.
  def audit_excluded_columns
    Auditable::EXCLUDED_COLUMNS - ["user_id"]
  end

  def reindex_permit_application
    permit_application&.reindex
  end
end
