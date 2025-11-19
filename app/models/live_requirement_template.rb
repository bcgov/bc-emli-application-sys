class LiveRequirementTemplate < RequirementTemplate
  # validate :unique_classification_for_undiscarded
  validate :unique_application_for_participant
  validate :unique_external_onboarding_for_contractor
  #validate :support_request_internal_only

  def visibility
    "live"
  end

  def support_request_internal_only
    return unless discarded_at.nil?

    return unless submission_type&.code&.to_sym == :support_request
    return if audience_type&.code.to_sym == :internal

    errors.add(
      :base,
      I18n.t(
        "activerecord.errors.models.requirement_template.support_request_internal_only"
      )
    )
  end

  def unique_external_onboarding_for_contractor
    return unless discarded_at.nil?

    # Only run this validation if the current object's types match the restricted combo
    unless types_match?(aud: :external, group: :contractor, sub: :onboarding)
      return
    end

    existing =
      LiveRequirementTemplate.where(
        program_id: program_id,
        audience_type_id: audience_type_id,
        user_group_type_id: user_group_type_id,
        submission_type_id: submission_type_id,
        discarded_at: nil
      )
    existing = existing.where.not(id: id) if id.present?

    if existing.exists?
      errors.add(
        :base,
        I18n.t(
          "activerecord.errors.models.requirement_template.nonunique_contractor_onboarding"
        )
      )
    end
  end

  def unique_application_for_participant
    return unless discarded_at.nil?

    # Only run this validation if the current object is for participant applications
    unless user_group_type&.code&.to_sym == :participant &&
             submission_type&.code&.to_sym == :application
      return
    end

    existing =
      LiveRequirementTemplate.where(
        program_id: program_id,
        audience_type_id: audience_type_id,
        user_group_type_id: user_group_type_id,
        submission_type_id: submission_type_id,
        discarded_at: nil
      )
    existing = existing.where.not(id: id) if id.present?

    if existing.exists?
      audience_name = audience_type&.name&.downcase || "unspecified audience"
      errors.add(
        :base,
        I18n.t(
          "activerecord.errors.models.requirement_template.nonunique_participant_application_per_audience",
          audience_name: audience_name
        )
      )
    end
  end

  def unique_classification_for_undiscarded
    return unless discarded_at.nil?

    audience_type = AudienceType.find_by(name: "External")&.id
    user_group_type = UserGroupType.find_by(name: "Participant")&.id

    existing_record =
      LiveRequirementTemplate
        .where.not(id: id)
        .find_by(
          audience_type_id: audience_type,
          user_group_type_id: user_group_type,
          # permit_type_id: permit_type_id,
          # activity_id: activity_id,
          # first_nations: first_nations,
          discarded_at: nil
        )

    if existing_record.present?
      if existing_record.present? && existing_record.id != id
        errors.add(
          :base,
          I18n.t(
            "activerecord.errors.models.requirement_template.nonunique_classification"
          )
        )
      end
    end
  end

  private

  def types_match?(aud:, group:, sub:)
    audience_type&.code&.to_sym == aud &&
      user_group_type&.code&.to_sym == group &&
      submission_type&.code&.to_sym == sub
  end
end
