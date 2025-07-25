class TemplateVersion < ApplicationRecord
  include TraverseDataJson
  include Auditable

  belongs_to :requirement_template
  belongs_to :deprecated_by, class_name: "User", optional: true

  has_many :jurisdiction_template_version_customizations, dependent: :destroy
  has_many :permit_applications, dependent: :nullify
  has_many :submitters, through: :permit_applications
  has_many :integration_mappings, dependent: :destroy

  delegate :permit_type, to: :requirement_template
  delegate :activity, to: :requirement_template
  delegate :label, to: :requirement_template
  delegate :published_template_version, to: :requirement_template
  delegate :first_nations, to: :requirement_template
  delegate :early_access?, to: :requirement_template
  delegate :public?, to: :requirement_template

  enum status: { scheduled: 0, published: 1, deprecated: 2 }, _default: 0
  enum deprecation_reason: { new_publish: 0, unscheduled: 1 }, _prefix: true

  validates :deprecation_reason, presence: true, if: :deprecated?
  validates :deprecated_by, presence: true, if: :deprecation_reason_unscheduled?

  before_validation :set_default_deprecation_reason

  after_save :reindex_models_if_published, if: :saved_change_to_status?
  after_save :create_integration_mappings
  after_save :notify_users_of_missing_requirements_mappings

  scope :for_sandbox,
        ->(sandbox) do
          if sandbox.present?
            where(status: sandbox.template_version_status_scope)
          else
            all
          end
        end

  def customizations
    # Convenience method to prevent carpal tunnel syndrome
    jurisdiction_template_version_customizations
  end

  def version_date_in_province_time
    version_date.in_time_zone("Pacific Time (US & Canada)").to_time
  end

  def label
    "#{requirement_template.label} (#{version_date.to_s})"
  end

  def lookup_props
    # form_json starts at root template
    flatten_requirements_from_form_hash(form_json)
  end

  def form_json_requirements
    json_requirements = []
    requirement_blocks_json.each_pair do |block_id, block_json|
      block_json["requirements"].each do |requirement|
        dup_requirement = requirement.dup

        dup_requirement["requirement_block_id"] = block_id

        json_requirements.push(dup_requirement)
      end
    end

    json_requirements
  end

  def publish_event_notification_data(recent_permit_application = nil)
    {
      "id" => SecureRandom.uuid,
      "action_type" =>
        Constants::NotificationActionTypes::NEW_TEMPLATE_VERSION_PUBLISH,
      "action_text" =>
        "#{I18n.t("notification.template_version.new_version_notification", template_label: label)}",
      "object_data" => {
        "template_version_id" => id,
        "previous_template_version_id" => previous_version.id,
        "requirement_template_id" => requirement_template_id,
        "permit_application_id" => recent_permit_application&.id
      }
    }
  end

  def template_published_notification_data
    # Use label if present, fallback to nickname, then description, then a default
    template_display_name =
      requirement_template.label.presence ||
        requirement_template.nickname.presence ||
        requirement_template.description.presence ||
        "Template ##{requirement_template.id[0..7]}"

    {
      "id" => SecureRandom.uuid,
      "action_type" => Constants::NotificationActionTypes::TEMPLATE_PUBLISHED,
      "action_text" =>
        I18n.t(
          "notification.template_version.template_published_notification",
          template_name: template_display_name,
          program_name: requirement_template.program.program_name,
          published_at: I18n.l(updated_at, format: :long)
        ),
      "object_data" => {
        "template_version_id" => id,
        "requirement_template_id" => requirement_template_id,
        "program_id" => requirement_template.program_id,
        "template_name" => template_display_name,
        "program_name" => requirement_template.program.program_name
      }
    }
  end

  def previous_version
    TemplateVersioningService.previous_published_version(self)
  end

  def latest_version
    TemplateVersioningService.latest_published_version(self)
  end

  def compare_requirements(before_version)
    TemplateVersioningService.produce_diff_hash(before_version, self)
  end

  def get_requirement_json(requirement_block_id, requirement_id)
    requirement_blocks_json
      .dig(requirement_block_id, "requirements")
      &.find { |req| req["id"] == requirement_id }
  end

  def create_integration_mappings
    return unless !deprecation_reason_unscheduled?

    api_enabled_jurisdictions = Jurisdiction.where(external_api_state: "j_on")

    existing_mapping_jurisdiction_ids =
      integration_mappings.pluck(:jurisdiction_id)

    jurisdictions_without_mappings =
      api_enabled_jurisdictions.where.not(id: existing_mapping_jurisdiction_ids)

    jurisdictions_without_mappings.each do |jurisdiction|
      integration_mappings.create(jurisdiction: jurisdiction)
    end
  end

  def force_publish_now!
    return unless scheduled?

    updated_template_version =
      TemplateVersioningService.publish_version!(self, true)

    WebsocketBroadcaster.push_update_to_relevant_users(
      User.system_admin.kept.all.pluck(:id), # only system admins can force publish
      Constants::Websockets::Events::TemplateVersion::DOMAIN,
      Constants::Websockets::Events::TemplateVersion::TYPES[:update],
      TemplateVersionBlueprint.render_as_hash(updated_template_version)
    )
  end

  private

  def create_integration_mappings_async
    return unless !deprecation_reason_unscheduled? && saved_change_to_status?

    if Rails.env.test?
      ModelCallbackJob.new.perform(
        self.class.name,
        id,
        "create_integration_mappings"
      )
    else
      ModelCallbackJob.perform_async(
        self.class.name,
        id,
        "create_integration_mappings"
      )
    end
  end

  def notify_users_of_missing_requirements_mappings
    return unless saved_change_to_status? && (published? || scheduled?)
    relevant_integration_mappings =
      integration_mappings.joins(:jurisdiction).where(
        { jurisdictions: { external_api_state: "j_on" } }
      )

    relevant_integration_mappings.each do |im|
      im.send_missing_requirements_mapping_communication
    end
  end

  def set_default_deprecation_reason
    return unless deprecated? && deprecation_reason.nil?

    self.deprecation_reason = "new_publish"
  end

  def reindex_models_if_published
    return unless published?

    begin
      requirement_template&.reindex
      permit_applications&.reindex
      previous_version&.permit_applications&.reindex
    rescue Elastic::Transport::Transport::Error => e
      Rails.logger.error "Failed to reindex models: #{e.message}"
      # Continue operation gracefully - reindexing will be skipped
    rescue StandardError => e
      Rails.logger.error "Unexpected error during reindexing: #{e.message}"
    end
  end
end
