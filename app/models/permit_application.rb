class PermitApplication < ApplicationRecord
  include FormSupportingDocuments
  include AutomatedComplianceUtils
  include StepCodeFieldExtraction
  include ZipfileUploader.Attachment(:zipfile)
  include PermitApplicationStatus
  include Auditable

  # SEARCH_INCLUDES = %i[
  #   permit_type
  #   submission_versions
  #   step_code
  #   activity
  #   jurisdiction
  #   submitter
  #   permit_collaborations
  # ]

  SEARCH_INCLUDES = %i[
    submission_versions
    submitter
    sandbox
    program
    assigned_users
    submission_type
    supporting_documents
  ]

  API_SEARCH_INCLUDES = %i[
    program
    submitter
    template_version
    submission_versions
    submission_type
    user_group_type
  ]

  searchkick word_middle: %i[
               number
               permit_classifications
               submitter_name
               review_delegatee_name
             ]

  belongs_to :submitter, class_name: "User"
  belongs_to :jurisdiction, optional: true
  belongs_to :permit_type, optional: true
  belongs_to :activity, optional: true
  belongs_to :program, counter_cache: true
  belongs_to :permit_classification, optional: true
  belongs_to :submission_type
  belongs_to :user_group_type
  belongs_to :audience_type
  belongs_to :template_version
  belongs_to :sandbox, optional: true

  # The front end form update provides a json payload of items we want to force update on the front-end since form io maintains its own state and does not 'rerender' if we send the form data back
  attr_accessor :front_end_form_update
  has_one :step_code
  has_many :submission_versions, dependent: :destroy
  has_many :permit_collaborations, dependent: :destroy
  has_many :collaborators, through: :permit_collaborations
  has_many :application_assignments
  has_many :assigned_users, through: :application_assignments, source: :user
  has_many :permit_block_statuses, dependent: :destroy

  scope :submitted, -> { joins(:submission_versions).distinct }

  scope :sandboxed, -> { where.not(sandbox_id: nil) }
  scope :live, -> { where(sandbox_id: nil) }
  scope :for_sandbox, ->(sandbox) { where(sandbox_id: sandbox&.id) }

  # Custom validation

  #validate :jurisdiction_has_matching_submission_contact
  #validate :pid_or_pin_presence
  validate :name_presence
  validates :number, presence: true
  validates :reference_number, length: { maximum: 300 }, allow_nil: true
  #validate :sandbox_belongs_to_jurisdiction

  delegate :qualified_name, to: :program, prefix: true
  delegate :program_name, to: :program
  delegate :code, :name, to: :permit_type, prefix: true
  delegate :code, :name, to: :activity, prefix: true

  delegate :code, :name, to: :user_group_type, prefix: true, allow_nil: true
  delegate :code, :name, to: :audience_type, prefix: true, allow_nil: true
  delegate :code, :name, to: :submission_type, prefix: true, allow_nil: true

  delegate :published_template_version, to: :template_version

  before_validation :assign_default_nickname, on: :create
  before_validation :assign_unique_number, on: :create
  before_validation :set_template_version, on: :create
  before_validation :populate_base_form_data, on: :create
  #before_save :take_form_customizations_snapshot_if_submitted

  after_commit :reindex_jurisdiction_permit_application_size
  after_commit :send_submitted_webhook, if: :saved_change_to_status?
  after_commit :notify_admin_updated_participant_app,
               if: :saved_change_to_status?
  after_commit :notify_user_reference_number_updated,
               if: :saved_change_to_reference_number?
  after_commit :schedule_incomplete_draft_notification,
               on: :create,
               if: :new_draft?
  after_commit :cancel_incomplete_draft_notification,
               if: :status_changed_from_draft?

  scope :with_submitter_role,
        -> { joins(:submitter).where(users: { role: "submitter" }) }

  scope :unviewed,
        -> do
          where(status: :submitted, viewed_at: nil).order(submitted_at: :asc)
        end

  COMPLETION_SECTION_KEY = "section-completion-key"

  def supporting_documents_for_submitter_based_on_user_permissions(
    supporting_documents,
    user: nil
  )
    return supporting_documents if user.blank?

    permissions =
      submission_requirement_block_edit_permissions(user_id: user.id)

    return supporting_documents if permissions == :all

    return [] if permissions.blank?

    supporting_documents.select do |s|
      next false if s.data_key.blank?

      rb_id = s.data_key[/RB([a-zA-Z0-9\-]+)/, 1]

      permissions.include?(rb_id)
    end
  end

  def formatted_submission_data(current_user: nil)
    PermitApplication::SubmissionDataService.new(
      self
    ).formatted_submission_data(current_user: current_user)
  end

  def users_by_collaboration_options(
    collaboration_type:,
    collaborator_type: nil,
    assigned_requirement_block_id: nil
  )
    base_where_clause = {
      collaborations: {
        permit_collaborations: {
          collaboration_type: collaboration_type,
          permit_application_id: id
        }
      }
    }

    base_where_clause[:collaborations][:permit_collaborations][
      :collaborator_type
    ] = collaborator_type if collaborator_type.present?

    base_where_clause[:collaborations][:permit_collaborations][
      :assigned_requirement_block_id
    ] = assigned_requirement_block_id if assigned_requirement_block_id.present?

    User
      .joins(collaborations: :permit_collaborations)
      .where(base_where_clause)
      .distinct
  end

  # Helper method to get the latest SubmissionVersion
  def latest_submission_version
    submission_versions.order(created_at: :desc).first
  end

  def earliest_submission_version
    submission_versions.order(created_at: :desc).last
  end

  # Method to get all revision requests from the latest SubmissionVersion
  def revision_requests
    latest_submission_version&.revision_requests || RevisionRequest.none
  end

  def form_json(current_user: nil)
    result =
      PermitApplication::FormJsonService.new(
        permit_application: self,
        current_user:
      ).call
    result.form_json
  end

  def force_update_published_template_version
    return unless Rails.env.development?
    # for development purposes only

    current_published_template_version.update(
      form_json:
        current_published_template_version.requirement_template.to_form_json
    )
  end

  def update_with_submission_data_merge(
    permit_application_params:,
    current_user: nil
  )
    PermitApplication::SubmissionDataService.new(
      self
    ).update_with_submission_data_merge(
      permit_application_params:,
      current_user:
    )
  end

  def search_data
    {
      number: number,
      nickname: nickname,
      permit_classifications:
        "#{user_group_type&.name} #{audience_type&.name} #{submission_type&.name}",
      submitter: "#{submitter.name} #{submitter.email}",
      submitter_name: submitter.name,
      submitted_at: submitted_at,
      resubmitted_at: resubmitted_at,
      viewed_at: viewed_at,
      status: status,
      #jurisdiction_id: jurisdiction&.id,
      user_group_type_id: user_group_type&.id,
      audience_type_id: audience_type&.id,
      submission_type_id: submission_type&.id,
      program_id: program&.id,
      submitter_id: submitter.id,
      template_version_id: template_version.id,
      requirement_template_id: template_version.requirement_template.id,
      created_at: created_at,
      updated_at: updated_at,
      using_current_template_version: using_current_template_version,
      review_delegatee_name:
        assigned_users.pluck(Arel.sql("first_name || ' ' || last_name")).join(
          " "
        ),
      user_ids_with_submission_edit_permissions:
        [submitter.id] +
          users_by_collaboration_options(collaboration_type: :submission).pluck(
            :id
          )
      # sandbox_id: sandbox_id
    }
  end

  def collaborator?(user_id:, collaboration_type:, collaborator_type: nil)
    users_by_collaboration_options(
      collaboration_type:,
      collaborator_type:
    ).exists?(id: user_id)
  end

  def submission_requirement_block_edit_permissions(user_id:)
    user = User.find(user_id)
    if user&.admin? || user&.admin_manager?
      if user.program_memberships.active.exists?(program_id: self.program_id)
        return :all
      end
    end

    if submitter_id != user_id &&
         !collaborator?(user_id:, collaboration_type: :submission)
      return nil
    end

    if submitter_id == user_id ||
         collaborator?(
           user_id:,
           collaboration_type: :submission,
           collaborator_type: :delegatee
         )
      return :all
    end

    permit_collaborations
      .joins(:collaborator)
      .where(collaboration_type: :submission, collaborators: { user_id: })
      .map(&:assigned_requirement_block_id)
      .compact
  end

  def indexed_using_current_template_version
    self.class.searchkick_index.retrieve(self)["using_current_template_version"]
  end

  # def formatted_permit_classifications
  #   "#{permit_type.name} - #{activity.name}"
  # end

  def using_current_template_version
    current_version = current_published_template_version
    Rails.logger.debug "Checking template version for permit application #{id}: current=#{template_version.id}, published=#{current_version&.id}"

    result = self.template_version.id == current_version&.id
    Rails.logger.debug "Template version match result: #{result}"

    result
  end

  def current_published_template_version
    # this will eventually be different, if there is a new version it should notify the user
    RequirementTemplate.published_requirement_template_version(
      program_id,
      user_group_type_id,
      audience_type_id,
      submission_type_id
    )
  end

  def form_customizations
    if submitted?
      form_customizations_snapshot
    else
      return nil unless jurisdiction
      jurisdiction
        .jurisdiction_template_version_customizations
        .find_by(template_version: template_version, sandbox_id: sandbox_id)
        &.customizations
    end
  end

  def update_viewed_at
    if latest_submission_version.present?
      latest_submission_version.update(viewed_at: Time.current)
      reindex
    else
      Rails.logger.warn(
        "Tried to update viewed_at, but latest_submission_version was nil"
      )
    end
  end

  def set_status(new_status, reason)
    if update(status: new_status, status_update_reason: reason)
      Rails.logger.debug("Successfully updated: #{self.attributes}")
      self
    else
      Rails.logger.error("Failed to update: #{errors.full_messages.join(", ")}")
      nil
    end
  end

  def number_prefix
    jurisdiction&.prefix
  end

  def notifiable_users
    relevant_collaborators = [submitter]
    designated_submitter =
      users_by_collaboration_options(
        collaboration_type: :submission,
        collaborator_type: :delegatee
      ).first

    if designated_submitter.present?
      relevant_collaborators << designated_submitter
    end

    if submitted?
      relevant_collaborators =
        relevant_collaborators +
          jurisdiction.review_managers if jurisdiction&.review_managers&.present?
      relevant_collaborators =
        relevant_collaborators +
          jurisdiction.regional_review_managers if jurisdiction&.regional_review_managers&.present?
      relevant_collaborators =
        relevant_collaborators +
          jurisdiction.reviewers if jurisdiction&.reviewers&.present?
    end

    relevant_collaborators
  end

  def set_template_version
    return unless template_version.blank?

    self.template_version = current_published_template_version
  end

  def populate_base_form_data
    self.submission_data = { data: {} }
  end

  def submitter_frontend_url
    FrontendUrlHelper.frontend_url("/permit-applications/#{id}/edit")
  end

  def reviewer_frontend_url
    FrontendUrlHelper.frontend_url("/permit-applications/#{id}")
  end

  def days_ago_submitted
    # Calculate the difference in days between the current date and the submitted_at date
    return nil unless submitted_at
    (Date.current - submitted_at.to_date).to_i
  end

  def formatted_submitted_at
    submitted_at&.strftime("%Y-%m-%d")
  end

  def formatted_viewed_at
    viewed_at&.strftime("%Y-%m-%d")
  end

  def formatted_revisions_requested_at
    revisions_requested_at&.strftime("%Y-%m-%d")
  end

  def formatted_resubmitted_at
    resubmitted_at&.strftime("%Y-%m-%d")
  end

  def permit_type_and_activity
    return "" unless activity && permit_type
    "#{activity.name} - #{permit_type.name}".strip
  end

  def confirmed_permit_type_submission_contacts
    return [] unless jurisdiction
    jurisdiction
      .permit_type_submission_contacts
      .where(permit_type: permit_type)
      .where.not(confirmed_at: nil)
  end

  def send_submit_notifications
    # Send application submission notifications to submitters and collaborators
    NotificationService.publish_application_submission_event(self)

    # Send notifications to jurisdiction contacts (commented out for now)
    # confirmed_permit_type_submission_contacts.each do |permit_type_submission_contact|
    #   PermitHubMailer.notify_reviewer_application_received(
    #     permit_type_submission_contact,
    #     self
    #   ).deliver_later
    # end
  end

  def formatted_submission_data_for_external_use
    ExternalPermitApplicationService.new(
      self
    ).formatted_submission_data_for_external_use
  end

  def formatted_raw_h2k_files_for_external_use
    ExternalPermitApplicationService.new(self).get_raw_h2k_files
  end

  def send_submitted_webhook
    return unless in_review?

    #TODO: if we want to implement webhooks were we call an external API when an application is submitted

    program
      .active_external_api_keys
      .where.not(
        webhook_url: [nil, ""]
      ) # Only send webhooks to keys with a webhook URL
      .each do |external_api_key|
        PermitWebhookJob.perform_async(
          external_api_key.id,
          Constants::Webhooks::Events::Application::APPLICATION_INREVIEW,
          id
        )
      end
  end

  def missing_pdfs
    missing_pdfs = []

    submission_versions.each do |submission_version|
      version_missing_pdfs = submission_version.missing_pdfs

      next if version_missing_pdfs.empty?

      missing_pdfs += version_missing_pdfs
    end

    missing_pdfs
  end

  def viewed_at
    latest_submission_version&.viewed_at
  end

  def submitted_at
    return nil if submission_versions.length < 1
    return earliest_submission_version.created_at
  end

  def resubmitted_at
    return nil if submission_versions.length <= 1
    return latest_submission_version.created_at
  end

  def submit_event_notification_data
    i18n_key =
      (
        if resubmitted_at.present?
          "notification.permit_application.resubmission_notification"
        else
          "notification.permit_application.submission_notification"
        end
      )

    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::APPLICATION_SUBMISSION,
      "action_text" =>
        "#{I18n.t(i18n_key, number: number, jurisdiction_name: program_name)}",
      "object_data" => {
        "permit_application_id" => id
      }
    }
  end

  def ineligible_event_notification_data
    # Choose the appropriate translation key based on whether reason exists
    action_text =
      if status_update_reason.present?
        I18n.t(
          "notification.permit_application.ineligible_notification_with_reason",
          number: number,
          program_name: program_name,
          reason: status_update_reason
        )
      else
        I18n.t(
          "notification.permit_application.ineligible_notification",
          number: number,
          program_name: program_name
        )
      end

    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::APPLICATION_INELIGIBLE,
      "action_text" => action_text,
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def revisions_request_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::APPLICATION_REVISIONS_REQUEST,
      "action_text" =>
        "#{I18n.t("notification.permit_application.revisions_request_notification", number: number, program_name: program_name)}",
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def application_view_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" => Constants::NotificationActionTypes::APPLICATION_VIEW,
      "action_text" =>
        "#{I18n.t("notification.permit_application.view_notification", number: number, program_name: program_name)}",
      "object_data" => {
        "permit_application_id" => id
      }
    }
  end

  def application_reference_updated_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::APPLICATION_REFERENCE_UPDATED,
      "action_text" =>
        "#{I18n.t("notification.permit_application.reference_updated_notification", number: number, jurisdiction_name: jurisdiction_name)}",
      "object_data" => {
        "permit_application_id" => id
      }
    }
  end

  def withdrawal_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::APPLICATION_WITHDRAWAL,
      "action_text" =>
        "#{I18n.t("notification.permit_application.withdrawal_notification", number: number, program_name: program_name)}",
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def new_submission_received_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::NEW_SUBMISSION_RECEIVED,
      "action_text" =>
        "#{I18n.t("notification.permit_application.new_submission_received_notification", number: number, program_name: program_name, submitted_at: I18n.l(submitted_at, format: :long))}",
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def application_assignment_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::APPLICATION_ASSIGNMENT,
      "action_text" =>
        "#{I18n.t("notification.permit_application.assignment_notification", number: number, program_name: program_name)}",
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def admin_updated_participant_app_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::ADMIN_UPDATED_PARTICIPANT_APP,
      "action_text" => "Admin updated participant application #{number}",
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def participant_incomplete_draft_notification_event_notification_data
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::PARTICIPANT_INCOMPLETE_DRAFT_NOTIFICATION,
      "action_text" =>
        "#{I18n.t("notification.permit_application.participant_incomplete_draft_notification", number: number, program_name: program_name)}",
      "object_data" => {
        "permit_application_id" => id,
        "permit_application_number" => number
      }
    }
  end

  def extract_email_from_submission_data
    return nil unless submission_versions.any?

    # Get the latest submission version data
    latest_data = submission_versions.last.submission_data
    return nil unless latest_data&.dig("data")

    # Search through all sections and fields for email
    latest_data
      .dig("data")
      .each do |section_key, section_data|
        next unless section_data.is_a?(Hash)

        section_data.each do |field_key, field_value|
          # Look for field keys that contain 'email'
          if field_key.include?("email") && field_value.is_a?(String) &&
               field_value.include?("@")
            return field_value
          end
        end
      end

    nil
  end

  def extract_participant_name_from_submission_data
    return { first_name: nil, last_name: nil } unless submission_versions.any?

    # Get the latest submission version data
    latest_data = submission_versions.last.submission_data
    return { first_name: nil, last_name: nil } unless latest_data&.dig("data")

    first_name = nil
    last_name = nil

    # Search through all sections and fields for first and last name
    latest_data
      .dig("data")
      .each do |section_key, section_data|
        next unless section_data.is_a?(Hash)

        section_data.each do |field_key, field_value|
          if field_key.include?("firstName") && field_value.is_a?(String) &&
               field_value.present?
            first_name = field_value
          elsif field_key.include?("lastName") && field_value.is_a?(String) &&
                field_value.present?
            last_name = field_value
          end
        end
      end

    { first_name: first_name, last_name: last_name }
  end

  def step_code_requirements
    return [] unless jurisdiction
    jurisdiction.permit_type_required_steps.where(permit_type_id:)
  end

  def notify_admin_updated_participant_app
    # Only trigger when status actually changed
    return unless saved_change_to_status?

    # Check if this is a status change from "update needed" to "submitted"
    previous_status = status_previously_was
    current_status = status

    # Only trigger for internal applications
    return unless audience_type&.name&.downcase == "internal"

    # Check if moving from revision/update needed states to submitted states
    update_needed_states = %w[revisions_requested update_needed]
    return unless update_needed_states.include?(previous_status)

    submitted_states = %w[newly_submitted resubmitted]
    return unless submitted_states.include?(current_status)

    NotificationService.publish_admin_updated_participant_app_event(self)
  end

  def energy_step_code_required?
    custom_requirements = step_code_requirements.customizations

    custom_requirements.empty? ||
      custom_requirements.any? do |r|
        r.energy_step_required || r.zero_carbon_step_required
      end
  end

  def self.stats_by_template_jurisdiction_and_status
    # Subquery to get the earliest submission_version.created_at per permit_application
    sv_min =
      SubmissionVersion.select(
        "permit_application_id, MIN(created_at) AS min_submission_created_at"
      ).group(:permit_application_id)

    sv_max =
      SubmissionVersion.select(
        "permit_application_id, MAX(created_at) AS max_submission_created_at"
      ).group(:permit_application_id)

    # Main aggregation query
    aggregates =
      PermitApplication
        .joins(template_version: :requirement_template)
        .joins(:submitter)
        .joins(:jurisdiction)
        .joins(
          "LEFT JOIN (#{sv_min.to_sql}) sv_min ON sv_min.permit_application_id = permit_applications.id"
        )
        .joins(
          "LEFT JOIN (#{sv_max.to_sql}) sv_max ON sv_max.permit_application_id = permit_applications.id"
        )
        .where(users: { role: "submitter" })
        .group(
          "jurisdictions.id",
          "requirement_templates.id",
          "jurisdictions.name"
        )
        .select(
          "jurisdictions.id AS jurisdiction_id",
          "requirement_templates.id AS requirement_template_id",
          "jurisdictions.name AS jurisdiction_name",
          "COUNT(CASE WHEN permit_applications.status IN (0, 3) THEN 1 END) AS draft_count",
          "COUNT(CASE WHEN permit_applications.status IN (1, 4) THEN 1 END) AS submitted_count",
          "AVG(
                CASE
                  WHEN sv_min.min_submission_created_at IS NOT NULL THEN EXTRACT(EPOCH FROM (sv_min.min_submission_created_at - permit_applications.created_at))
                  ELSE EXTRACT(EPOCH FROM (NOW() - permit_applications.created_at))
                END
              ) AS average_time_spent_before_first_submit",
          "AVG(
                CASE
                  WHEN sv_max.max_submission_created_at IS NOT NULL THEN EXTRACT(EPOCH FROM (sv_max.max_submission_created_at - permit_applications.created_at))
                  ELSE EXTRACT(EPOCH FROM (NOW() - permit_applications.created_at))
                END
              ) AS average_time_spent_before_latest_submit"
        )

    # Preload requirement templates with associated permit_type and activity
    requirement_templates =
      RequirementTemplate.includes(:permit_type, :activity).index_by(&:id)

    # Transform the aggregated data into the desired format
    aggregates.map do |aggregate|
      requirement_template =
        requirement_templates[aggregate.requirement_template_id]
      {
        jurisdiction_name:
          aggregate.jurisdiction_name || "Unknown Jurisdiction",
        permit_type: requirement_template.permit_type.name,
        activity: requirement_template.activity.name,
        first_nations: requirement_template.first_nations,
        draft_applications: aggregate.draft_count.to_i,
        submitted_applications: aggregate.submitted_count.to_i,
        average_time_spent_before_first_submit:
          (aggregate.average_time_spent_before_first_submit || 0).to_i,
        average_time_spent_before_latest_submit:
          (aggregate.average_time_spent_before_latest_submit || 0).to_i
      }
    end
  end

  def new_draft?
    status == "new_draft"
  end

  private

  def update_collaboration_assignments
    # TODO: Implement this method to remove collaborations for missing requirement block when a new template is published
  end

  def assign_default_nickname
    self.nickname =
      "#{jurisdiction&.qualified_name}: #{full_address || pid || pin || id}" if self.nickname.blank?
  end

  def assign_unique_number
    last_number =
      program
        .permit_applications
        .order(Arel.sql("LENGTH(number) DESC"), number: :desc)
        .limit(1)
        .pluck(:number)
        .first

    # Notice that the last number comes from the specific program

    if last_number
      number_parts = last_number.split("-")
      new_integer = number_parts[0..-1].join.to_i + 1 # Increment the sequence

      # the remainder of dividing any number by 1000 always gives the last 3 digits
      # Removing the last 3 digits (integer division by 1000), then taking the remainder above gives the middle 3
      # Removing the last 6 digits (division), then taking the remainder as above gives the first 3 digits

      # irb(main):008> 123456789 / 1_000
      # => 123456
      # irb(main):010> 123456 % 1000
      # => 456
      # irb(main):009> 123456789 / 1_000_000
      # => 123
      # irb(main):013> 123 % 1000
      # => 123

      # %03d pads with 0s
      new_number =
        format(
          "%03d-%03d-%03d",
          new_integer / 1_000_000 % 1000,
          new_integer / 1000 % 1000,
          new_integer % 1000
        )
    else
      # Start with the initial number if there are no previous numbers
      new_number = format("000-000-001")
    end

    # Assign the new number to the permit application
    self.number = new_number if self.number.blank?
    return new_number
  end

  def take_form_customizations_snapshot_if_submitted
    return unless status_changed? && submitted?
    return unless jurisdiction

    current_customizations =
      jurisdiction
        .jurisdiction_template_version_customizations
        .find_by(template_version: template_version)
        &.customizations

    return unless current_customizations.present?

    self.form_customizations_snapshot = current_customizations
  end

  def notify_user_reference_number_updated
    return if new_record?
    NotificationService.publish_application_view_event(self)
  end

  def reindex_jurisdiction_permit_application_size
    return unless jurisdiction.present?
    return unless new_record? || destroyed? || saved_change_to_jurisdiction_id?

    jurisdiction.reindex
  end

  def submitter_must_have_role
    unless submitter&.submitter?
      errors.add(
        :submitter,
        I18n.t(
          "activerecord.errors.models.permit_application.attributes.submitter.incorrect_role"
        )
      )
    end
  end

  def jurisdiction_has_matching_submission_contact
    matching_contacts =
      PermitTypeSubmissionContact.where(
        jurisdiction: jurisdiction,
        permit_type: permit_type
      )
    if matching_contacts.empty?
      errors.add(
        :jurisdiction,
        I18n.t(
          "activerecord.errors.models.permit_application.attributes.jurisdiction.no_contact"
        )
      )
    end
  end

  def pid_or_pin_presence
    if pin.blank? && pid.blank?
      errors.add(
        :base,
        I18n.t(
          "activerecord.errors.models.permit_application.attributes.pid_or_pin"
        )
      )
    end
  end

  def sandbox_belongs_to_jurisdiction
    return unless sandbox

    unless jurisdiction.sandboxes.include?(sandbox)
      errors.add(:sandbox, "must belong to the jurisdiction")
    end
  end

  def name_presence
    errors.add(:base, "Application Name can't be blank") if nickname.blank?
  end

  def schedule_incomplete_draft_notification
    # Schedule job to run in 24 hours
    ParticipantIncompleteDraftNotificationJob.perform_in(24.hours, id)
  end

  def cancel_incomplete_draft_notification
    # Cancel scheduled job if status changed from draft to submitted
    # Note: This is a simplified approach - in production, you might want to store
    # the job ID and cancel it specifically, but Sidekiq doesn't have built-in
    # job cancellation by content. The job itself has safety checks.
    Rails.logger.info(
      "Application #{id} status changed from draft - job will be skipped by safety check"
    )
  end

  def status_changed_from_draft?
    saved_change_to_status? && status_previously_was == "new_draft"
  end
end
