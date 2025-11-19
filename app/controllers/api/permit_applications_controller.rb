class Api::PermitApplicationsController < Api::ApplicationController
  include Api::Concerns::Search::PermitApplications

  before_action :set_permit_application,
                only: %i[
                  show
                  update
                  submit
                  upload_supporting_document
                  finalize_revision_requests
                  remove_revision_requests
                  mark_as_viewed
                  change_status
                  update_version
                  generate_missing_pdfs
                  update_revision_requests
                  create_permit_collaboration
                  invite_new_collaborator
                  remove_collaborator_collaborations
                  assign_user_to_application
                  create_or_update_permit_block_status
                  destroy
                ]
  skip_after_action :verify_policy_scoped, only: [:index]

  def index
    perform_permit_application_search
    authorized_results =
      apply_search_authorization(@permit_application_search.results)

    render_success authorized_results,
                   nil,
                   {
                     meta: {
                       total_pages: @permit_application_search.total_pages,
                       total_count: @permit_application_search.total_count,
                       current_page: @permit_application_search.current_page
                     },
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :base,
                       current_user: current_user
                     }
                   }
  end

  def mark_as_viewed
    authorize @permit_application
    @permit_application.update_viewed_at
    render_success @permit_application,
                   nil,
                   { blueprint_opts: { view: :program_review_extended } }
  end

  def change_status
    authorize @permit_application

    status_param = params[:status]
    status_update_reason_param = params[:status_update_reason]
    unless PermitApplication.statuses.key?(status_param)
      return render_error("Invalid status", :unprocessable_entity)
    end

    @permit_application.set_status(status_param, status_update_reason_param)

    render_success @permit_application,
                   nil,
                   { blueprint_opts: { view: :program_review_extended } }
  end

  def show
    authorize @permit_application
    render_success @permit_application,
                   nil,
                   {
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: show_blueprint_view_for(current_user),
                       current_user: current_user
                     }
                   }
  end

  def update
    authorize @permit_application

    # always reset the submission section keys until actual submission
    # Skip this reset for admin users doing Save Edits (they want to preserve signed status)
    unless current_user.review_staff? && @permit_application.submitted?
      submission_section =
        permit_application_params.dig(
          "submission_data",
          "data",
          "section-completion-key"
        )
      submission_section&.each { |key, value| submission_section[key] = nil }
    end

    update_submitted_for_from_submission_data

    is_current_user_submitter =
      current_user.id == @permit_application.submitter_id

    if @permit_application.draft? &&
         @permit_application.update_with_submission_data_merge(
           permit_application_params:
             (
               if is_current_user_submitter
                 permit_application_params
               else
                 submission_collaborator_permit_application_params
               end
             ),
           current_user: current_user
         )
      if !Rails.env.development? || ENV["RUN_COMPLIANCE_ON_SAVE"] == "true"
        AutomatedCompliance::AutopopulateJob.perform_async(
          @permit_application.id
        )
      end
      render_success @permit_application,
                     ("permit_application.save_draft_success"),
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: :extended,
                         current_user: current_user
                       }
                     }
    elsif @permit_application.submitted? &&
          @permit_application.update(submitted_permit_application_params)
      render_success @permit_application,
                     ("permit_application.save_success"),
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: show_blueprint_view_for(current_user),
                         current_user: current_user
                       }
                     }
    else
      render_error "permit_application.update_error",
                   message_opts: {
                     error_message:
                       @permit_application.errors.full_messages.join(", ")
                   }
    end
  end

  def update_revision_requests
    authorize @permit_application

    latest_version = @permit_application.latest_submission_version
    if latest_version&.update(revision_request_params)
      render_success @permit_application,
                     "permit_application.save_success",
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: :jurisdiction_review_extended
                       }
                     }
    else
      # Collect more detailed error messages
      latest_version_errors =
        if latest_version.respond_to?(:errors)
          latest_version.errors.full_messages
        else
          []
        end
      permit_application_errors = @permit_application.errors.full_messages
      detailed_errors =
        (latest_version_errors + permit_application_errors).join(", ").presence
      # Render the detailed error response
      render_error "permit_application.update_error",
                   message_opts: {
                     error_message: detailed_errors
                   }
    end
  end

  def update_version
    authorize @permit_application

    if TemplateVersioningService.update_draft_permit_with_new_template_version(
         @permit_application
       )
      render_success @permit_application,
                     ("permit_application.update_version_succes"),
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: :extended,
                         current_user: current_user
                       }
                     }
    else
      render_error "permit_application.update_error",
                   message_opts: {
                     error_message:
                       @permit_application.errors.full_messages.join(", ")
                   }
    end
  end

  def upload_supporting_document
    authorize @permit_application
    success = @permit_application.update(supporting_document_params)
    if success
      # Send websocket update to refresh supporting documents immediately
      WebsocketBroadcaster.push_update_to_relevant_users(
        @permit_application.notifiable_users.pluck(:id),
        Constants::Websockets::Events::PermitApplication::DOMAIN,
        Constants::Websockets::Events::PermitApplication::TYPES[
          :update_supporting_documents
        ],
        PermitApplicationBlueprint.render_as_hash(
          @permit_application.reload,
          { view: :supporting_docs_update, current_user: current_user }
        )
      )

      regex_pattern =
        "(#{supporting_document_params["supporting_documents_attributes"].map { |spd| spd.dig("file", "id") }.compact.join("|")})$"
      render_success @permit_application.supporting_documents.file_ids_with_regex(
                       regex_pattern
                     ),
                     nil,
                     {
                       blueprint: SupportingDocumentBlueprint,
                       blueprint_opts: {
                         view: :form_io_details
                       }
                     }
    else
      render_error "permit_application.update_error",
                   message_opts: {
                     error_message:
                       @permit_application.errors.full_messages.join(", ")
                   }
    end
  end

  # def submit
  #   authorize @permit_application
  #   # for submissions, we do not run the automated compliance as that should have already been complete

  #   update_submitted_for_from_submission_data

  #   is_current_user_submitter =
  #     current_user.id == @permit_application.submitter_id

  #   params_to_use =
  #     if is_current_user_submitter
  #       permit_application_params
  #     else
  #       submission_collaborator_permit_application_params
  #     end
  #   update_success = @permit_application.update(params_to_use)
  #   @permit_application.send(:set_flow) if update_success

  #   submit_success = @permit_application.submit! if update_success

  #   if update_success && submit_success
  #     # Notify admin staff about new submission
  #     NotificationService.publish_new_submission_received_event(
  #       @permit_application
  #     )

  #     render_success @permit_application,
  #                    nil,
  #                    {
  #                      blueprint: PermitApplicationBlueprint,
  #                      blueprint_opts: {
  #                        view: :extended,
  #                        current_user: current_user
  #                      }
  #                    }
  #   else
  #     render_error "permit_application.submit_error",
  #                  message_opts: {
  #                    error_message:
  #                      @permit_application.errors.full_messages.join(", ")
  #                  }
  #   end
  # rescue AASM::InvalidTransition
  #   # Provide specific error message for template version issues on draft applications
  #   # Other statuses get generic state error (could be signing, validation, etc.)
  #   if !@permit_application.using_current_template_version &&
  #        @permit_application.new_draft?
  #     render_error "permit_application.outdated_error", message_opts: {}
  #   else
  #     render_error "permit_application.submit_state_error", message_opts: {}
  #   end
  # end
  def submit
    authorize @permit_application

    update_submitted_for_from_submission_data

    is_current_user_submitter =
      current_user.id == @permit_application.submitter_id

    params_to_use =
      (
        if is_current_user_submitter
          permit_application_params
        else
          submission_collaborator_permit_application_params
        end
      )

    update_success = @permit_application.update(params_to_use)
    @permit_application.send(:set_flow) if update_success
    submit_success = @permit_application.submit! if update_success

    if update_success && submit_success
      handle_submission_notifications(@permit_application)

      render_success @permit_application,
                     nil,
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :extended,
                       current_user: current_user
                     }
    else
      render_error "permit_application.submit_error",
                   message_opts: {
                     error_message:
                       @permit_application.errors.full_messages.join(", ")
                   }
    end
  rescue AASM::InvalidTransition
    if !@permit_application.using_current_template_version &&
         @permit_application.new_draft?
      render_error "permit_application.outdated_error", message_opts: {}
    else
      render_error "permit_application.submit_state_error", message_opts: {}
    end
  end

  def create
    submitter =
      if params[:contractor_id].present?
        Contractor.find(params[:contractor_id])
      else
        current_user
      end

    @permit_application =
      PermitApplication.build(
        permit_application_params.to_h.merge(
          submitter: submitter,
          sandbox: current_sandbox
        )
      )

    authorize @permit_application

    if @permit_application.save
      if !Rails.env.development? || ENV["RUN_COMPLIANCE_ON_SAVE"] == "true"
        AutomatedCompliance::AutopopulateJob.perform_async(
          @permit_application.id
        )
      end

      render_success @permit_application,
                     "permit_application.create_success",
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: :extended,
                         current_user: current_user, # can be nil here
                         submitter: @permit_application.submitter # always present
                       }
                     }
    else
      render_error "permit_application.create_error",
                   message_opts: {
                     error_message:
                       @permit_application.errors.full_messages.join(", ")
                   }
    end
  end

  def create_permit_collaboration
    begin
      @permit_collaboration =
        PermitCollaboration::CollaborationManagementService.new(
          @permit_application
        ).assign_collaborator!(
          authorize_collaboration: ->(permit_collaboration) do
            authorize permit_collaboration,
                      policy_class: PermitApplicationPolicy
          end,
          collaborator_id: permit_collaboration_params[:collaborator_id],
          collaborator_type: permit_collaboration_params[:collaborator_type],
          assigned_requirement_block_id:
            permit_collaboration_params[:assigned_requirement_block_id]
        )

      render_success @permit_collaboration,
                     "permit_application.assign_collaborator_success",
                     {
                       blueprint: PermitCollaborationBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    rescue PermitCollaborationError => e
      render_error "permit_application.assign_collaborator_error",
                   message_opts: {
                     error_message: e.message
                   }
    end
  end

  def assign_user_to_application
    begin
      user = User.find(application_assignment_params[:user_id])
      authorize(
        { permit_application: @permit_application, assigned_user: user },
        :create?,
        policy_class: ApplicationAssignmentPolicy
      )

      @application_assignment =
        ApplicationAssignments::AssignmentManagementService.new(
          @permit_application
        ).assign_user_to_application(user)

      # Send assignment notification to the assigned user
      NotificationService.publish_application_assignment_event(
        @permit_application,
        user
      )

      render_success @application_assignment,
                     "permit_application.assign_user_success",
                     {
                       blueprint: ApplicationAssignmentBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    rescue ActiveRecord::RecordNotFound => e
      render_error "permit_application.assign_user_error",
                   message_opts: {
                     error_message: e.message
                   }
    end
  end

  def invite_new_collaborator
    begin
      @permit_collaboration =
        PermitCollaboration::CollaborationManagementService.new(
          @permit_application
        ).invite_new_submission_collaborator!(
          authorize_collaboration: ->(permit_collaboration) do
            authorize permit_collaboration,
                      policy_class: PermitApplicationPolicy
          end,
          user_params: collaborator_invite_params[:user],
          inviter: current_user,
          collaborator_type: collaborator_invite_params[:collaborator_type],
          assigned_requirement_block_id:
            collaborator_invite_params[:assigned_requirement_block_id]
        )

      render_success @permit_collaboration,
                     "permit_application.assign_collaborator_success",
                     {
                       blueprint: PermitCollaborationBlueprint,
                       blueprint_opts: {
                         view: :base
                       }
                     }
    rescue PermitCollaborationError => e
      # The skip_authorization is necessary here as if there are any errors
      # in the invite_new_submission_collaborator! method, before the permit_collaboration
      # is created, the policy will not be able to authorize the permit_collaboration
      skip_authorization
      render_error "permit_application.assign_collaborator_error",
                   message_opts: {
                     error_message: e.message
                   }
    end
  end

  def generate_missing_pdfs
    authorize @permit_application

    # Temporarily disabled deduplication to test Ruby PDF generation
    # TODO: Re-enable after testing
    # if @permit_application.zipfile_data.present? &&
    #      @permit_application.updated_at > 2.minutes.ago
    #   Rails.logger.info "Recent zip exists for permit #{@permit_application.id}, not queuing new job"
    #   render json: { success: true, message: "Recent zip file already exists" }, status: :ok
    #   return
    # end

    Rails.logger.info "Queuing ZipfileJob for permit #{@permit_application.id}"
    ZipfileJob.perform_async(@permit_application.id)
    head :ok
  end

  def finalize_revision_requests
    authorize @permit_application
    if @permit_application.finalize_revision_requests!
      render_success @permit_application,
                     "permit_application.revision_request_finalize_success",
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: :extended,
                         current_user: current_user
                       }
                     }
    else
      render_error "permit_application.revision_request_finalize_error"
    end
  end

  def remove_revision_requests
    authorize @permit_application
    latest_version = @permit_application.latest_submission_version

    unless latest_version
      return(
        render_error "permit_application.remove_error",
                     message_opts: {
                       error_message: "No latest version found."
                     }
      )
    end

    # Remove revision requests explicitly
    if latest_version.revision_requests.destroy_all
      # Restore original form data from submission version (true rollback!)
      original_data = latest_version.submission_data
      @permit_application.update!(submission_data: original_data)

      # Transition back to original submitted state
      if @permit_application.may_cancel_revision_requests?
        @permit_application.cancel_revision_requests!
      end

      render_success @permit_application,
                     "permit_application.remove_success",
                     { blueprint: PermitApplicationBlueprint }
    else
      render_error "permit_application.remove_success",
                   message_opts: {
                     error_message:
                       latest_version.errors.full_messages.join(", ")
                   }
    end
  end

  def remove_collaborator_collaborations
    authorize @permit_application

    collaborations_to_remove =
      @permit_application.permit_collaborations.where(
        collaborator_id: params.require(:collaborator_id),
        collaborator_type: params.require(:collaborator_type),
        collaboration_type: params.require(:collaboration_type)
      )

    if collaborations_to_remove.destroy_all
      render_success nil,
                     "permit_application.remove_collaborator_collaborations_success",
                     {
                       blueprint: PermitApplicationBlueprint,
                       blueprint_opts: {
                         view: :extended
                       }
                     }
    else
      render_error "permit_application.remove_collaborator_collaborations_error"
    end
  end

  def create_or_update_permit_block_status
    @permit_block_status =
      @permit_application.permit_block_statuses.find_or_initialize_by(
        requirement_block_id: params.require(:requirement_block_id),
        collaboration_type: params.require(:collaboration_type)
      )

    authorize @permit_block_status, policy_class: PermitApplicationPolicy

    @permit_block_status.set_by_user = current_user

    @permit_block_status.with_lock do
      if @permit_block_status.update(status: params.require(:status))
        render_success @permit_block_status,
                       "permit_application.create_or_update_permit_block_status_success",
                       { blueprint: PermitBlockStatusBlueprint }
      else
        render_error "permit_application.create_or_update_permit_block_status_error",
                     message_opts: {
                       error_message:
                         @permit_block_status.errors.full_messages.join(", ")
                     }
      end
    end
  end

  def download_application_metrics_csv
    authorize :permit_application, :download_application_metrics_csv?

    csv_data = PermitApplicationExportService.new.application_metrics_csv
    send_data csv_data, type: "text/csv"
  end

  def destroy
    authorize @permit_application

    # Store application data AND notification data before transaction
    application_data = {
      number: @permit_application.number,
      user: @permit_application.submitter
    }

    # Generate notification data before destruction using model method
    withdrawal_notification_data =
      @permit_application.withdrawal_event_notification_data

    success =
      ActiveRecord::Base.transaction do
        @permit_application.destroy ? true : false
      end

    if success
      # Send notifications after successful transaction
      NotificationService.publish_application_withdrawal_event_with_data(
        application_data[:user].id,
        withdrawal_notification_data
      )

      PermitHubMailer.notify_application_withdrawn(
        application_data[:number],
        application_data[:user]
      )&.deliver_later

      # render_success nil, "permit_application.delete_success"
    else
      render_error "permit_application.delete_error",
                   message_opts: {
                     error_message:
                       @permit_application.errors.full_messages.join(", ")
                   }
    end
  end

  private

  def handle_submission_notifications(application)
    submission_type = application.submission_type&.code&.to_sym
    user_group_type = application.user_group_type&.code&.to_sym
    audience_type = application.audience_type&.code&.to_sym

    case [submission_type, user_group_type, audience_type]
    when %i[support_request participant internal]
      # NotificationService.publish_support_request_admin_event(application)
    when %i[support_request participant external]
      #
    when %i[onboarding contractor external]
      #
    else
      # Notify admin staff about new submission
      NotificationService.publish_new_submission_received_event(application)
    end
  end

  def show_blueprint_view_for(user)
    if params[:review] && user.review_staff?
      :jurisdiction_review_extended
    else
      :extended
    end
  end

  def set_permit_application
    @permit_application =
      if current_user.system_admin? || current_user.participant? ||
           current_user.admin_manager?
        PermitApplication.find(params[:id])
      else
        PermitApplication.for_sandbox(current_sandbox).find(params[:id])
      end
  end

  def permit_application_params # params for submitters
    params.require(:permit_application).permit(
      :activity_id,
      :permit_type_id,
      :jurisdiction_id,
      :full_address,
      :nickname,
      :submitted_for,
      :pin,
      :pid,
      :first_nations,
      submission_data: {
      }
    )
  end

  def application_assignment_params
    params.require(:application_assignment).permit(:user_id)
  end

  def submission_collaborator_permit_application_params # permit application params collaborators can update if they are a collaborator during submission
    designated_submitter =
      @permit_application.users_by_collaboration_options(
        collaboration_type: :submission,
        collaborator_type: :delegatee
      ).first
    if designated_submitter&.id == current_user.id
      params.require(:permit_application).permit(:nickname, submission_data: {})
    else
      params.require(:permit_application).permit(submission_data: {})
    end
  end

  def permit_collaboration_params
    params.require(:permit_collaboration).permit(
      :collaborator_id,
      :collaborator_type,
      :assigned_requirement_block_id
    )
  end

  def collaborator_invite_params
    params.require(:collaborator_invite).permit(
      :collaborator_type,
      :assigned_requirement_block_id,
      user: %i[email first_name last_name]
    )
  end

  def supporting_document_params
    params.require(:permit_application).permit(
      supporting_documents_attributes: [
        :data_key,
        file: [:id, :storage, metadata: {}]
      ]
    )
  end

  def submitted_permit_application_params # params for submitters
    if current_user.review_staff? # Allow admins to update submission_data on submitted applications
      params.require(:permit_application).permit(
        :reference_number,
        submission_data: {
        }
      )
    else
      params.require(:permit_application).permit(:reference_number)
    end
  end

  def revision_request_params # params for submitters
    params.require(:submission_version).permit(
      revision_requests_attributes: [
        :id,
        :user_id,
        :_destroy,
        :reason_code,
        :comment,
        :performed_by,
        requirement_json: {
        },
        submission_json: {
        }
      ]
    )
  end

  def update_submitted_for_from_submission_data
    # Extract first name and last name dynamically from submission data
    submission_data = permit_application_params.dig("submission_data", "data")
    first_name = nil
    last_name = nil

    submission_data&.each do |section_key, section_data|
      section_data.each do |field_key, field_value|
        if field_key.include?("firstName")
          first_name = field_value
        elsif field_key.include?("lastName")
          last_name = field_value
        end
      end
    end

    # Update submitted_for with first name and last name if present
    if first_name.present? || last_name.present?
      submitted_for_name = [first_name, last_name].compact.join(" ").strip
      if submitted_for_name.present?
        @permit_application.update(submitted_for: submitted_for_name)
      end
    end
  end
end
