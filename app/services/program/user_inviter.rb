class Program::UserInviter
  attr_accessor :results
  attr_reader :inviter, :users_params, :program

  def initialize(inviter:, users_params:, program:)
    @inviter = inviter
    @users_params = users_params
    @program = program
    @results = { invited: [], reinvited: [], email_taken: [] }
  end

  def call
    invite_users
    self
  end

  def invite_users
    users_params.each do |user_params|
      email = user_params[:email].strip.downcase
      role = user_params[:role].to_sym
      inbox_access = user_params[:inbox_access] || []

      user = User.find_by(email: email)

      if user.present? && !user.discarded? && user.confirmed?
        self.results[:email_taken] << user
        next
      end

      reinvited = user.present?

      if reinvited
        Current.user = inviter
        user.update!(role: role) if inviter.invitable_roles.include?(role.to_s)
        force_invite!(user, inviter, program: @program, role: role)
        self.results[:reinvited] << user
      else
        user = User.create!(email: email, role: role, discarded_at: nil)
        force_invite!(user, inviter, program: @program, role: role)
        self.results[:invited] << user
      end

      # create or find a ProgramMembership for the user
      program_membership =
        ProgramMembership.find_or_create_by!(user: user, program: program)

      # rebuild program classifications for thier ProgramMembership
      ProgramClassificationMembership.where(
        program_membership: program_membership
      ).delete_all

      # assign classifications
      inbox_access.each do |entry|
        user_group_code = entry[:user_group_type]
        submission_code = entry[:submission_type]

        user_group =
          PermitClassification.find_by(
            code: PermitClassification.codes[user_group_code]
          )
        next unless user_group

        submission =
          if submission_code.present?
            PermitClassification.find_by(
              code: PermitClassification.codes[submission_code]
            )
          end

        ProgramClassificationMembership.find_or_create_by!(
          program_membership: program_membership,
          user_group_type: user_group,
          submission_type: submission
        )
      end
    end
  end

  def force_invite!(user, inviter, program:, role:)
    # Associate the inviter and set invitation timestamps
    user.assign_attributes(
      invited_by: inviter,
      invitation_created_at: Time.current,
      invitation_sent_at: Time.current
    )

    # Generate a new secure random token and hash it for storage
    token = Devise.friendly_token
    user.invitation_token =
      Devise.token_generator.digest(User, :invitation_token, token)

    # Suppress Devise's default confirmation email (we're only inviting)
    user.skip_confirmation_notification!

    # Save the user without validation
    user.save!(validate: false)

    # Send the custom invitation email with program ID and friendly role text
    CustomDeviseMailer.invitation_instructions(
      user,
      token,
      program_id: program.id,
      role_text: User.human_attribute_name("roles.#{role}")
    ).deliver_later
  end
end
