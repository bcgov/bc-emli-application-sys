class NotificationPolicy < ApplicationPolicy
  def index?
    authenticated?
  end

  def reset_last_read?
    authenticated?
  end

  def destroy?
    authenticated?
  end

  def clear_all?
    authenticated?
  end

  private

  def authenticated?
    user.present?
  end
end
