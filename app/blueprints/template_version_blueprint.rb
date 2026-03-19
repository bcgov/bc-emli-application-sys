class TemplateVersionBlueprint < Blueprinter::Base
  identifier :id
  fields :status,
         :deprecation_reason,
         :created_at,
         :updated_at,
         :version_date,
         :label,
         :first_nations,
         :requirement_template_id

  field :early_access do |template_version|
    template_version.early_access?
  end

  field :public do |template_version|
    template_version.public?
  end

  field :version_date do |template_version|
    # Parse version date in BC time
    template_version.version_date_in_province_time
  end

  view :extended do
    fields :denormalized_template_json, :form_json, :requirement_blocks_json

    field :latest_version_id do |template_version|
      template_version.latest_version&.id
    end
  end

  view :external_api do
    excludes :deprecation_reason,
             :created_at,
             :updated_at,
             :label,
             :first_nations,
             :early_access,
             :public
  end

  view :schema do
    excludes :deprecation_reason,
             :created_at,
             :updated_at,
             :label,
             :first_nations,
             :early_access,
             :public

    field :nickname do |tv|
      tv.requirement_template.nickname.presence || ""
    end

    field :description do |tv|
      tv.requirement_template.description
    end

    field :requirement_blocks do |tv, _options|
      tv.requirement_blocks_json.map do |_block_id, block|
        {
          requirement_block_code: block["sku"],
          name: block["name"],
          requirements:
            block["requirements"].map do |req|
              entry = {
                requirement_code: req["requirement_code"],
                label: req["label"],
                input_type: req["input_type"]
              }
              entry[:value_options] = req.dig(
                "input_options",
                "value_options"
              ) if req.dig("input_options", "value_options").present?
              entry
            end
        }
      end
    end
  end
end
