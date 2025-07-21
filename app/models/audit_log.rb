class AuditLog < ApplicationRecord
  belongs_to :user, optional: true

  validates :table_name, presence: true
  validates :action, presence: true

  # Basic scopes that use our indexes
  scope :by_user, ->(user) { where(user: user) }
  scope :by_table, ->(table_name) { where(table_name: table_name) }
  scope :recent, -> { order(created_at: :desc) }

  # Advanced scopes that leverage composite indexes
  scope :for_table_since,
        ->(table_name, date) do
          where(table_name: table_name).where("created_at >= ?", date).order(
            :created_at
          )
        end
  scope :by_user_since,
        ->(user, date) do
          where(user: user).where("created_at >= ?", date).order(:created_at)
        end

  # Convenience methods for common queries
  def self.recent_changes(limit = 100)
    recent.limit(limit).includes(:user)
  end

  def self.user_activity(user, days_back = 30)
    by_user_since(user, days_back.days.ago)
  end
end
