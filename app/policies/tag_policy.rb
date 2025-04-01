class TagPolicy < ApplicationPolicy
  def index?
    user.system_admin?
  end

  class Scope < Scope
    def resolve
      [] unless user.system_admin?

      scope.joins(:taggings).all
    end
  end
end
