class ApplicationAssignment < ApplicationRecord
  include Auditable

  belongs_to :user
  belongs_to :permit_application, foreign_key: 'permit_application_id'

  validates :user_id, uniqueness: { scope: :permit_application_id }
end
