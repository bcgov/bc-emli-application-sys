# frozen_string_literal: true

class ApplicationPolicy
  attr_reader :user, :sandbox, :record

  def initialize(user_context, record)
    @user = user_context.user
    @sandbox = user_context.sandbox
    @record = record
  end

  def index?
    false
  end

  def show?
    false
  end

  def create?
    false
  end

  def new?
    create?
  end

  def update?
    false
  end

  def edit?
    update?
  end

  def destroy?
    false
  end

  class Scope
    attr_accessor :user, :sandbox, :scope

    def initialize(user_context, scope)
      @user = user_context.user
      @sandbox = user_context.sandbox
      @scope = scope
    end

    # Fail closed, matching Pundit's own generated default. A policy that is used with
    # policy_scope must define its own Scope#resolve; inheriting a permissive `scope.all`
    # here means any future index action on a model whose policy has no Scope silently
    # returns the entire table, and verify_policy_scoped still passes because it only
    # checks that policy_scope was called - not that it narrowed anything.
    def resolve
      raise NotImplementedError, "You must define #resolve in #{self.class}"
    end
  end
end
