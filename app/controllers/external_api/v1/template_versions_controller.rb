class ExternalApi::V1::TemplateVersionsController < ExternalApi::ApplicationController
  before_action :ensure_external_api_key_authorized!
  before_action :set_template_version, only: :show

  def index
    results =
      policy_scope([:external_api, TemplateVersion]).includes(
        :requirement_template
      )

    render_success results,
                   nil,
                   {
                     meta: {
                       total_count: results.count
                     },
                     blueprint: TemplateVersionBlueprint,
                     blueprint_opts: {
                       view: :schema
                     }
                   }
  end

  def show
    authorize [:external_api, @template_version]

    render_success @template_version,
                   nil,
                   {
                     blueprint: TemplateVersionBlueprint,
                     blueprint_opts: {
                       view: :schema
                     }
                   }
  end

  private

  def set_template_version
    @template_version =
      TemplateVersion.for_sandbox(current_sandbox).find(
        params[:template_version_id]
      )
  end
end
