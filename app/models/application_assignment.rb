class ApplicationAssignment < ApplicationRecord
  include Auditable

  belongs_to :user
  belongs_to :permit_application

  validates :user_id, uniqueness: { scope: :permit_application_id }
end
