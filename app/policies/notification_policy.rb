class NotificationPolicy < ApplicationPolicy
  def index?
    true
  end

  def reset_last_read?
    true
  end

  def destroy?
    true
  end
end
