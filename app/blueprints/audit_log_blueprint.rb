class AuditLogBlueprint < Blueprinter::Base
  identifier :id

  fields :table_name, :action, :data_before, :data_after, :created_at

  view :extended do
    association :user, blueprint: UserBlueprint, view: :minimal

    field :details do |audit_log|
      AuditLogHelper.format_changes(audit_log)
    end

    field :timestamp_formatted do |audit_log|
      audit_log
        .created_at
        .in_time_zone("America/Vancouver")
        .strftime("%Y-%m-%d at %H:%M")
    end
  end
end
