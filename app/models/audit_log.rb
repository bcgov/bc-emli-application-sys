class AuditLog < ApplicationRecord
  validates :table_name, presence: true
  validates :action, presence: true
end