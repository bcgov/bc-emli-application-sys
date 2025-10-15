class RequirementTemplate < ApplicationRecord
  SEARCH_INCLUDES = %i[
    published_template_version
    permit_type
    last_three_deprecated_template_versions
    activity
    scheduled_template_versions
    audience_type
    program
    submission_type
    user_group_type
  ]

  searchkick searchable: %i[
               permit_type
               program
               nickname
               user_group_type
               audience_type
               submission_type
             ],
             word_start: %i[
               permit_type
               program
               nickname
               user_group_type
               audience_type
               submission_type
             ]

  #  text_middle: %i[description current_version permit_type program nickname]

  belongs_to :activity, optional: true
  belongs_to :permit_type, optional: true
  belongs_to :program, optional: true, foreign_key: "program_id"
  belongs_to :audience_type, optional: true
  belongs_to :user_group_type, optional: true
  belongs_to :submission_type, optional: true
  belongs_to :copied_from, class_name: "RequirementTemplate", optional: true

  has_many :requirement_template_sections,
           -> { order(position: :asc) },
           dependent: :destroy
  has_many :requirement_blocks, through: :requirement_template_sections
  has_many :requirements, through: :requirement_blocks
  has_many :template_versions,
           -> { order(version_date: :desc) },
           dependent: :destroy
  has_many :scheduled_template_versions,
           -> do
             where(template_versions: { status: "scheduled" }).order(
               version_date: :desc
             )
           end,
           class_name: "TemplateVersion"
  has_many :last_three_deprecated_template_versions,
           -> do
             where(template_versions: { status: "deprecated" }).order(
               version_date: :desc
             ).limit(3)
           end,
           class_name: "TemplateVersion"
  has_many :jurisdiction_template_version_customizations

  belongs_to :copied_from,
             class_name: "RequirementTemplate",
             foreign_key: "copied_from_id",
             optional: true

  # Self-referential association for sections copied from this section
  has_many :copied_sections,
           class_name: "RequirementTemplate",
           foreign_key: "copied_from_id",
           dependent: :nullify

  has_one :published_template_version,
          -> { where(status: "published") },
          class_name: "TemplateVersion"

  # Scope to get RequirementTemplates with a published template version
  scope :for_sandbox,
        ->(sandbox) do
          joins(:template_versions).where(
            template_versions: {
              status: sandbox&.template_version_status_scope || :published
            }
          )
        end

  after_commit :refresh_search_index, if: :saved_change_to_discarded_at

  include Discard::Model
  include Auditable

  accepts_nested_attributes_for :requirement_template_sections,
                                allow_destroy: true

  # This is a workaround needed to validate step code related errors
  attr_accessor :requirement_template_sections_attributes_copy

  validate :validate_uniqueness_of_blocks
  validate :validate_step_code_related_dependencies
  validate :public_only_for_early_access_preview

  def assignee
    nil
  end

  def early_access?
    type == "EarlyAccessRequirementTemplate"
  end

  def live?
    type == "LiveRequirementTemplate"
  end

  def visibility
    if early_access?
      "early_access"
    elsif live?
      "live"
    end
  end

  def sections
    requirement_template_sections
  end

  def customizations
    # Convenience method to prevent carpal tunnel syndrome
    jurisdiction_template_version_customizations
  end

  def label
    ""
  end

  def key
    "requirementtemplate#{id}"
  end

  def to_form_json
    JSON.parse(
      {
        id: id,
        key: key,
        input: false,
        tableView: false,
        components:
          requirement_template_sections.map(&:to_form_json).concat(
            [
              {
                id: "section-completion-id",
                key: "section-completion-key",
                type: "container",
                title: I18n.t("formio.requirement_template.completion_title"),
                label: I18n.t("formio.requirement_template.completion_title"),
                custom_class: "formio-section-container",
                hide_label: false,
                collapsible: false,
                initially_collapsed: false,
                components: [
                  id: "section-signoff-id",
                  key: "section-signoff-key",
                  type: "panel",
                  title:
                    I18n.t("formio.requirement_template.signoff_panel_title"),
                  collapsible: true,
                  collapsed: false,
                  components: [
                    {
                      type: "checkbox",
                      key: "signed",
                      title:
                        I18n.t(
                          "formio.requirement_template.signoff_checkbox_title"
                        ),
                      label:
                        I18n.t(
                          "formio.requirement_template.signoff_checkbox_label"
                        ),
                      inputType: "checkbox",
                      validate: {
                        required: true
                      },
                      input: true,
                      defaultValue: false
                    },
                    {
                      key: "submit",
                      size: "md",
                      type: "button",
                      block: false,
                      input: true,
                      title:
                        I18n.t(
                          "formio.requirement_template.signoff_submit_title"
                        ),
                      label:
                        I18n.t(
                          "formio.requirement_template.signoff_submit_title"
                        ),
                      theme: "primary",
                      action: "submit",
                      widget: {
                        type: "input"
                      },
                      disabled: false,
                      show: false,
                      conditional: {
                        show: true,
                        when: "signed",
                        eq: "true"
                      }
                    }
                  ]
                ]
              }
            ]
          )
      }.to_json
    )
  end

  def self.published_requirement_template_version(
    program_id,
    user_group_type_id,
    audience_type_id,
    submission_type_id
  )
    # Parameter validation - prevents nil query issues
    if [
         program_id,
         user_group_type_id,
         audience_type_id,
         submission_type_id
       ].any?(&:blank?)
      return nil
    end

    requirement_template =
      joins(:published_template_version)
        .where(
          program_id: program_id,
          user_group_type_id: user_group_type_id,
          audience_type_id: audience_type_id,
          submission_type_id: submission_type_id,
          discarded_at: nil
        )
        .order(:created_at)
        .first

    published_version = requirement_template&.published_template_version
    published_version
  rescue StandardError => e
    Rails.logger.error "Template version lookup failed: #{e.message}, program_id: #{program_id}, classifications: [#{user_group_type_id}, #{audience_type_id}, #{submission_type_id}]"
  end

  def search_data
    {
      program_id: program_id,
      nickname: nickname&.downcase,
      program: program&.program_name.to_s.downcase,
      description: description,
      first_nations: first_nations,
      current_version: published_template_version&.version_date,
      permit_type: nil,
      activity: nil,
      audience_type: audience_type&.name.to_s.downcase,
      user_group_type: user_group_type&.name.to_s.downcase,
      submission_type: submission_type&.name.to_s.downcase,
      discarded: discarded_at.present?,
      assignee: assignee&.name,
      visibility: visibility,
      public: public?,
      created_at: created_at
    }
  end

  private

  def public_only_for_early_access_preview
    if public && !early_access?
      errors.add(
        :public,
        I18n.t(
          "activerecord.errors.models.requirement_template.attributes.public.true_on_early_access_only"
        )
      )
    end
  end

  def validate_uniqueness_of_blocks
    # Track duplicates across all sections within the same template
    duplicates =
      requirement_blocks
        .unscope(:order)
        .group(:id)
        .having("COUNT(*) > 1")
        .pluck(:name)
  end

  def requirement_block_ids_from_nested_attributes_copy
    # have to manually loop instead of using association because
    # when using deeply nested attributes to save, the queries go against the database
    # which will have stale data e.g. records trying to delete currently

    if requirement_template_sections_attributes_copy.blank? ||
         !requirement_template_sections_attributes_copy.is_a?(Array)
      return []
    end

    ids = []

    requirement_template_sections_attributes_copy.each do |rtsa|
      next if rtsa["_destroy"] == true
      rtsa["template_section_blocks_attributes"].each do |tsba|
        next if tsba["_destroy"] == true
        requirement_block_id = tsba["requirement_block_id"]

        ids << requirement_block_id if requirement_block_id.present?
      end
    end

    ids
  end

  def energy_step_code_requirements_from_nest_attributes_copy
    requirement_block_ids = requirement_block_ids_from_nested_attributes_copy

    return [] unless requirement_block_ids.length.positive?

    Requirement.where(
      requirement_block_id: requirement_block_ids,
      input_type: Requirement.input_types[:energy_step_code]
    )
  end

  def step_code_package_file_requirements_from_nest_attributes_copy
    requirement_block_ids = requirement_block_ids_from_nested_attributes_copy

    return [] unless requirement_block_ids.length.positive?

    Requirement.where(
      requirement_block_id: requirement_block_ids,
      requirement_code: Requirement::STEP_CODE_PACKAGE_FILE_REQUIREMENT_CODE
    )
  end

  def validate_uniqueness_of_blocks
    requirement_block_ids = requirement_block_ids_from_nested_attributes_copy
    grouped_ids = requirement_block_ids.group_by { |e| e }
    duplicate_ids = grouped_ids.select { |k, v| v.length > 1 }.keys
    duplicates = RequirementBlock.where(id: duplicate_ids).pluck(:name)

    duplicates.each do |duplicate_block_name|
      errors.add(
        :base,
        I18n.t(
          "model_validation.requirement_template.duplicate_block_in_template",
          requirement_block_name: duplicate_block_name
        )
      )
    end
  end

  def validate_step_code_related_dependencies
    energy_step_code_requirements_count =
      energy_step_code_requirements_from_nest_attributes_copy.count
    step_code_package_file_requirements_count =
      step_code_package_file_requirements_from_nest_attributes_copy.count

    has_any_step_code_requirements = energy_step_code_requirements_count > 0
    has_any_step_code_package_file_requirements =
      step_code_package_file_requirements_count > 0
    has_duplicate_step_code_requirements =
      energy_step_code_requirements_count > 1
    has_duplicate_step_code_package_file_requirements =
      step_code_package_file_requirements_count > 1

    return unless has_any_step_code_requirements

    if !has_any_step_code_package_file_requirements
      errors.add(:base, :step_code_package_required)
    end
    if has_duplicate_step_code_requirements
      errors.add(:base, :duplicate_energy_step_code)
    end
    if has_duplicate_step_code_package_file_requirements
      errors.add(:base, :duplicate_step_code_package)
    end
  end

  def refresh_search_index
    RequirementTemplate.search_index.refresh
  end
end
