class Api::InvitationsController < ApplicationController
  include BaseControllerMethods
  respond_to :json

  before_action :authenticate_user!, except: %i[show]
  before_action :set_current_program, only: %i[show create]
  before_action :find_invited_user, only: %i[show]

  def create
    @program = Program.find(params[:program_id])

    inviter =
      Program::UserInviter.new(
        inviter: current_user,
        program: current_program,
        users_params: users_params
      ).call

    if inviter.results.values.flatten.any?
      render_success(inviter.results, nil, { blueprint: InvitationBlueprint })
    else
      render_error "user.create_invite_error"
    end
  end

  def show
    @program = Program.find(params[:program_id])
    if @invited_user
      render_success @invited_user,
                     nil,
                     {
                       blueprint: UserBlueprint,
                       blueprint_opts: {
                         view: :invited_user,
                         program: @program
                       }
                     }
    else
      render json: { error: :invalid_token }, status: :not_found
    end
  end

  private

  def set_current_program
    @current_program = Program.find(params[:program_id])
  end

  def current_program
    @current_program
  end

  def users_params
    params
      .require(:users)
      .map do |user_param|
        user_param.permit(
          :email,
          :role,
          inbox_access: %i[user_group_type submission_type]
        )
      end
  end

  def find_invited_user
    @invited_user = User.find_by_invitation_token(params[:id], true)
  end

  def render_accept_invite_error(resource)
    render_error "user.accept_invite_error",
                 {
                   message_opts: {
                     error_message: resource.errors.full_messages.join(", ")
                   }
                 }
  end
end
