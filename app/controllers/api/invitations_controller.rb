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
    case @invite_status
    when :valid
      render_success @invited_user,
                     nil,
                     {
                       blueprint: UserBlueprint,
                       blueprint_opts: {
                         view: :invited_user,
                         program: @program
                       }
                     }
    when :expired
      render json: {
               error: :expired_token,
               status: :not_acceptable
             },
             status: :unprocessable_entity
    when :accepted
      render json: {
               error: :already_accepted,
               status: :accepted
             },
             status: :unprocessable_entity
    else
      render json: {
               error: :invalid_token,
               status: :invalid
             },
             status: :not_found
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
    token = params[:id].to_s.strip

    @invited_user = User.find_by_invitation_token(token, false)
    @invitation_sent_on =
      DateTime.parse(@invited_user.invitation_sent_at.inspect)
    @invitation_expires_on = @invitation_sent_on + 14

    if @invited_user == nil
      @invite_status = :invalid
    elsif @invitation_expires_on <= DateTime.now
      @invite_status = :expired
    else
      @invite_status = :valid
    end
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
