class Api::InternalCommentsController < Api::ApplicationController
  before_action :set_permit_application
  skip_after_action :verify_policy_scoped, only: [:index]

  def index
    authorize @permit_application, :view_internal_comments?

    comments =
      @permit_application.internal_comments.includes(:user).order(:created_at)

    render_success comments,
                   nil,
                   {
                     blueprint: InternalCommentBlueprint,
                     blueprint_opts: {
                       view: :base
                     }
                   }
  end

  def create
    authorize @permit_application, :create_internal_comment?

    comment =
      @permit_application.internal_comments.new(
        internal_comment_params.merge(user: current_user)
      )

    if comment.save
      render_success comment,
                     nil,
                     {
                       status: :created,
                       blueprint: InternalCommentBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    else
      render_error(
        "internal_comment.create_error",
        status: :unprocessable_entity,
        message_opts: {
          error_message: comment.errors.full_messages.join(", ")
        }
      )
    end
  end

  def destroy
    comment = @permit_application.internal_comments.find(params[:id])
    authorize comment, :destroy?
    comment.destroy
    head :no_content
  end

  private

  # Frontend posts a flat { body }, so permit it at the top level (no resource nesting).
  def internal_comment_params
    params.permit(:body)
  end

  def set_permit_application
    @permit_application = PermitApplication.find(params[:permit_application_id])
  end
end
