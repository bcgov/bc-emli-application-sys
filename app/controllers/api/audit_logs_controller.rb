class Api::AuditLogsController < Api::ApplicationController
  before_action :authenticate_user!

  def filter_options
    authorize :audit_log, :index?

    actions = policy_scope(AuditLog).distinct.pluck(:action).compact.sort
    tables =
      policy_scope(AuditLog)
        .distinct
        .pluck(:table_name)
        .compact
        .sort
        .map { |table| display_table_name(table) }
    users =
      policy_scope(AuditLog)
        .joins(:user)
        .distinct
        .pluck("users.email")
        .compact
        .sort

    render json: {
             data: {
               actions: actions,
               tables: tables,
               users: users
             },
             meta: {
             }
           }
  end

  def index
    authorize :audit_log, :index?

    audit_logs_query =
      policy_scope(AuditLog).includes(:user).order(created_at: :desc)

    # Apply filters
    if params[:action_filter].present?
      audit_logs_query = audit_logs_query.where(action: params[:action_filter])
    end

    if params[:user_filter].present?
      audit_logs_query =
        audit_logs_query.joins(:user).where(
          users: {
            email: params[:user_filter]
          }
        )
    end

    if params[:table_filter].present?
      # Convert display name back to actual table name for querying
      actual_table_name = reverse_display_table_name(params[:table_filter])
      audit_logs_query = audit_logs_query.where(table_name: actual_table_name)
    end

    if params[:date_from].present?
      audit_logs_query =
        audit_logs_query.where(
          "created_at >= ?",
          Date.parse(params[:date_from]).beginning_of_day
        )
    end

    if params[:date_to].present?
      audit_logs_query =
        audit_logs_query.where(
          "created_at <= ?",
          Date.parse(params[:date_to]).end_of_day
        )
    end

    # Handle CSV export
    if params[:format] == "csv" || request.format.csv?
      csv_limit = ENV.fetch("AUDIT_LOG_CSV_EXPORT_LIMIT", 50_000).to_i
      audit_logs = audit_logs_query.limit(csv_limit)
      csv_data = generate_csv(audit_logs)

      send_data csv_data,
                filename: "audit_logs_#{Date.current.strftime("%Y%m%d")}.csv",
                type: "text/csv",
                disposition: "attachment"
      return
    end

    # Regular JSON response with pagination
    page = (params[:page] || 1).to_i
    per_page = (params[:per_page] || 50).to_i
    offset = (page - 1) * per_page

    total_count = audit_logs_query.count
    audit_logs = audit_logs_query.limit(per_page).offset(offset)

    total_pages = (total_count / per_page.to_f).ceil

    render_success audit_logs,
                   nil,
                   {
                     meta: {
                       total_pages: total_pages,
                       total_count: total_count,
                       current_page: page,
                       per_page: per_page
                     },
                     blueprint: AuditLogBlueprint,
                     blueprint_opts: {
                       view: :extended
                     }
                   }
  end

  private

  def generate_csv(audit_logs)
    require "csv"

    CSV.generate(headers: true) do |csv|
      # CSV headers
      csv << %w[Date/Time User Action Table Details]

      audit_logs.each do |log|
        user_info =
          (
            if log.user
              "#{log.user.first_name} #{log.user.last_name} (#{log.user.email})"
            else
              "System"
            end
          )
        details = AuditLogHelper.format_changes(log).join("; ")

        csv << [
          log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
          user_info,
          log.action.capitalize,
          log.table_name,
          details
        ]
      end
    end
  end

  def display_table_name(table_name)
    case table_name
    when "permit_applications"
      I18n.t("audit_log.applications", default: "applications")
    else
      table_name
    end
  end

  def reverse_display_table_name(display_name)
    case display_name
    when I18n.t("audit_log.applications", default: "applications")
      "permit_applications"
    else
      display_name
    end
  end
end
