module ExternalApi::Concerns::Search::PermitApplications
  extend ActiveSupport::Concern

  def perform_permit_application_search
    ensure_external_api_key_authorized!

    where = permit_application_where_clause
    return if performed? # invalid classification/status code -> 400 already rendered

    search_conditions = {
      order: permit_application_order,
      match: :word_start,
      where: where,
      page: normalized_page(permit_application_search_params[:page]),
      per_page:
        normalized_per_page(permit_application_search_params[:per_page]),
      includes: PermitApplication::API_SEARCH_INCLUDES
    }

    @permit_application_search =
      PermitApplication.search(permit_application_query, **search_conditions)
  end

  private

  def permit_application_search_params
    params.permit(
      :page,
      :per_page,
      constraints: [
        :permit_classifications,
        :status,
        user_group_type: [],
        submission_type: [],
        audience_type: [],
        submission_variant: [],
        status: [],
        submitted_at: %i[gt lt gte lte],
        resubmitted_at: %i[gt lt gte lte],
        screened_in_at: %i[gt lt gte lte],
        updated_at: %i[gt lt gte lte]
      ],
      sort: %i[field direction]
    )
  end

  def permit_application_query
    # We do not support querying for permit applications for external apis
    "*"
  end

  def permit_application_order
    if (sort = permit_application_search_params[:sort])
      { sort[:field] => { order: sort[:direction], unmapped_type: "long" } }
    else
      { submitted_at: { order: :desc, unmapped_type: "long" } }
    end
  end

  def permit_application_where_clause
    constraints =
      (
        permit_application_search_params[:constraints] || {}
      ).to_h.deep_symbolize_keys

    where = { program_id: current_external_api_key.program_id }

    # Translate classification codes -> ids (each may render a 400 + return nil).
    {
      user_group_type: [UserGroupType, :user_group_type_id],
      submission_type: [SubmissionType, :submission_type_id],
      audience_type: [AudienceType, :audience_type_id],
      submission_variant: [SubmissionVariant, :submission_variant_id]
    }.each do |param, (klass, field)|
      ids = classification_ids_for(klass, constraints[param], param)
      return if performed?
      where[field] = ids if ids.present?
    end

    # Pass through the remaining constraints (permit_classifications, status, date
    # ranges); status normalized to an array. No hardcoded in_review default —
    # omitting status returns all statuses.
    passthrough =
      constraints.except(
        :user_group_type,
        :submission_type,
        :audience_type,
        :submission_variant
      )

    # Validate status against the known codes (mirrors /summary's 400; an unknown
    # status would otherwise silently match nothing).
    if passthrough[:status].present?
      statuses = Array.wrap(passthrough[:status]).map(&:to_s)
      invalid = statuses - PermitApplication.statuses.keys
      if invalid.any?
        render json: {
                 error: "Invalid status: #{invalid.join(", ")}"
               },
               status: :bad_request
        return
      end
      passthrough[:status] = statuses
    end

    # Validate date-range values are Unix-ms integers before they reach
    # Elasticsearch (a malformed value otherwise raises an unhandled 500).
    %i[submitted_at resubmitted_at screened_in_at updated_at].each do |field|
      next if passthrough[field].blank?
      validated = validate_unix_ms_range(passthrough[field], field)
      return if performed?
      if validated.present?
        passthrough[field] = validated
      else
        passthrough.delete(field)
      end
    end

    where.merge!(passthrough)

    where
  end
end
