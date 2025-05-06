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
        user.skip_confirmation_notification!
        user.invite!(inviter)
        self.results[:reinvited] << user
      else
        user = User.new(email: email, role: role, discarded_at: nil)
        user.skip_confirmation_notification!
        user.save!
        user.invite!(inviter)
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
end
