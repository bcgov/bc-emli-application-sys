class InternalCommentPolicy < ApplicationPolicy
  # Author-only delete: a review-staff user may delete only their own comment.
  def destroy?
    user.review_staff? && record.user_id == user.id
  end
end
