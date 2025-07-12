class ApplicationAssignmentPolicy < ApplicationPolicy
  def initialize(user_context, record)
    super(user_context, record)
    @permit_application = record[:permit_application]
    @assigned_user = record[:assigned_user]
  end

  def create?
    # Basic permission check - can this user assign applications at all?
    return false unless user.admin_manager? || user.admin?

    # assigned_user is required for assignment authorization
    return false if assigned_user.nil?

    # Admin managers can assign to admin managers and admins
    if user.admin_manager?
      return assigned_user.admin_manager? || assigned_user.admin?
    end

    # Admins can only assign to other admins
    return assigned_user.admin? if user.admin?

    false
  end

  # Class method to filter user IDs based on assignment permissions
  def self.assignable_user_ids(current_user, user_ids)
    return [] unless current_user.admin_manager? || current_user.admin?

    if current_user.admin_manager?
      # Admin managers can assign to admin_managers and admins
      User.where(id: user_ids, role: %w[admin_manager admin]).pluck(:id)
    elsif current_user.admin?
      # Admins can only assign to admins
      User.where(id: user_ids, role: "admin").pluck(:id)
    else
      []
    end
  end

  private

  attr_reader :permit_application, :assigned_user
end
