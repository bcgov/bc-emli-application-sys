class ApplicationAssignment < ApplicationRecord
  include Auditable

  belongs_to :user
  belongs_to :permit_application

  validates :user_id, uniqueness: { scope: :permit_application_id }

  after_commit :reindex_permit_application, on: %i[create destroy]

  private

  def reindex_permit_application
    permit_application&.reindex
  end
end
