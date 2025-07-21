class AuditLog < ApplicationRecord
  belongs_to :user, optional: true

  validates :table_name, presence: true
  validates :action, presence: true

  # Basic scopes that use our indexes
  scope :by_user, ->(user) { where(user: user) }
  scope :by_table, ->(table_name) { where(table_name: table_name) }
  scope :by_action, ->(action) { where(action: action) }
  scope :recent, -> { order(created_at: :desc) }

  # Advanced scopes that leverage composite indexes
  scope :for_table_since,
        ->(table_name, date) do
          where(table_name: table_name).where("created_at >= ?", date).order(
            :created_at
          )
        end
  scope :by_table_and_action,
        ->(table_name, action) { where(table_name: table_name, action: action) }
  scope :by_user_since,
        ->(user, date) do
          where(user: user).where("created_at >= ?", date).order(:created_at)
        end

  # JSONB query scopes using GIN index
  scope :with_field_change,
        ->(field) do
          where(
            "data_after ? :field OR data_before ? :field",
            field: field.to_s
          )
        end
  scope :field_changed_to,
        ->(field, value) do
          where(
            "data_after ->> :field = :value",
            field: field.to_s,
            value: value.to_s
          )
        end

  # Convenience methods for common queries
  def self.changes_to_record(table_name, record_id)
    by_table(table_name).where(
      "data_after ->> 'id' = ? OR data_before ->> 'id' = ?",
      record_id.to_s,
      record_id.to_s
    )
  end

  def self.recent_changes(limit = 100)
    recent.limit(limit).includes(:user)
  end

  def self.user_activity(user, days_back = 30)
    by_user_since(user, days_back.days.ago)
  end
end
