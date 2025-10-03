class ContractorEmployeeInviter
  attr_reader :contractor, :program, :invited_by, :results

  def initialize(contractor:, program:, invited_by:)
    @contractor = contractor
    @program = program
    @invited_by = invited_by
    @results = { invited: [], reinvited: [], email_taken: [] }
  end

  def invite_employees(users_params)
    users_params.each { |user_params| invite_employee(user_params) }
    results
  end

  private

  def invite_employee(user_params)
    email = user_params[:email].strip.downcase
    name = user_params[:name]
    role = user_params[:role]&.to_sym || :contractor

    user = User.find_by(email: email)

    if user.present? && !user.discarded?
      return handle_email_taken(user) if employee_exists?(user)
      reinvite_user(user, role)
    else
      invite_new_user(email, name, role)
    end
  end

  def employee_exists?(user)
    ContractorEmployee.exists?(contractor: contractor, employee: user)
  end

  def handle_email_taken(user)
    results[:email_taken] << user
  end

  def reinvite_user(user, role)
    user.update!(role: role) if invited_by.invitable_roles.include?(role.to_s)
    user.invite!(invited_by, invitation_options)
    results[:reinvited] << user
    create_associations(user)
  end

  def invite_new_user(email, name, role)
    user_attrs = build_user_attributes(email, name, role)
    user = User.create!(user_attrs)
    user.invite!(invited_by, invitation_options)
    results[:invited] << user
    create_associations(user)
  end

  def build_user_attributes(email, name, role)
    attrs = { email: email, role: role, discarded_at: nil }

    if name.present?
      name_parts = name.strip.split(" ", 2)
      attrs[:first_name] = name_parts[0]
      attrs[:last_name] = name_parts[1] if name_parts.length > 1
    end

    attrs
  end

  def create_associations(user)
    ContractorEmployee.find_or_create_by!(
      contractor: contractor,
      employee: user
    )

    ProgramMembership.find_or_create_by!(user: user, program: program)
  end

  def invitation_options
    { contractor_name: contractor.business_name, program_id: program.id }
  end
end
