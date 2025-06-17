class NotificationPolicy < ApplicationPolicy
  def index?
    user.present?
  end

  def reset_last_read?
    user.present?
  end

  def destroy?
    user.present?
  end

  def clear_all?
    user.present?
  end

  private

  def authenticated?
    user.present?
  end
end
