import { ApiResponse, ApisauceInstance, create, Monitor } from 'apisauce';
import { TCreatePermitApplicationFormData } from '../../components/domains/energy-savings-application/new-energy-savings-application-screen';
import { IRevisionRequestForm } from '../../components/domains/energy-savings-application/revision-sidebar';
import { IJurisdictionTemplateVersionCustomizationForm } from '../../components/domains/requirement-template/screens/jurisdiction-edit-digital-permit-screen';
import { TContactFormData } from '../../components/shared/contact/create-edit-contact-modal';
import { IEarlyAccessPreview } from '../../models/early-access-preview';
import { IExternalApiKey } from '../../models/external-api-key';
import { IIntegrationMapping } from '../../models/integration-mapping';
import { IJurisdiction } from '../../models/jurisdiction';
import { IJurisdictionTemplateVersionCustomization } from '../../models/jurisdiction-template-version-customization';
import { IEnergySavingsApplication } from '../../models/energy-savings-application';
import {
  IActivity,
  IPermitType,
  IAudienceType,
  ISubmissionType,
  IUserGroupType,
} from '../../models/permit-classification';
import { IPermitCollaboration } from '../../models/permit-collaboration';
import { IRequirementTemplate } from '../../models/requirement-template';
import { IStepCode } from '../../models/step-code';
import { IStepCodeChecklist } from '../../models/step-code-checklist';
import { ITemplateVersion } from '../../models/template-version';
import { IUser } from '../../models/user';
import { ISiteConfigurationStore } from '../../stores/site-configuration-store';
import {
  IExternalApiKeyParams,
  IIntegrationMappingUpdateParams,
  IInvitePreviewersParams,
  IRequirementBlockParams,
  IRequirementTemplateUpdateParams,
  ITagSearchParams,
} from '../../types/api-request';
import {
  IAcceptInvitationResponse,
  IApiResponse,
  ICollaboratorSearchResponse,
  IJurisdictionPermitApplicationResponse,
  IJurisdictionResponse,
  INotificationResponse,
  IOptionResponse,
  IProgramResponse,
  IRequirementBlockResponse,
  IRequirementTemplateResponse,
  IUsersResponse,
} from '../../types/api-responses';
import {
  EActiveUserSortFields,
  ECollaborationType,
  ECollaboratorType,
  EDeactivatedUserSortFields,
  EEarlyAccessRequirementTemplateSortFields,
  EJurisdictionSortFields,
  EPendingUserSortFields,
  EPermitApplicationSortFields,
  EPermitBlockStatus,
  EProgramSortFields,
  ERequirementLibrarySortFields,
  ERequirementTemplateSortFields,
  ETemplateVersionStatus,
  EUserSortFields,
} from '../../types/enums';
import {
  IContact,
  ICopyRequirementTemplateFormData,
  IJurisdictionFilters,
  IJurisdictionSearchFilters,
  IPermitApplicationSearchFilters,
  ITemplateVersionDiff,
  TAutoComplianceModuleConfigurations,
  TCreateRequirementTemplateFormData,
  TSearchParams,
  ISyncClassificationsParams,
  TInviteUserParams,
} from '../../types/types';
import { camelizeResponse, decamelizeRequest } from '../../utils';
import { getCsrfToken } from '../../utils/utility-functions';
import { IProgram } from '../../models/program';
import { TCreateEnergyApplicationFormData } from '../../components/domains/energy-savings-application/new-application';

export class Api {
  client: ApisauceInstance;

  constructor() {
    this.client = create({
      baseURL: '/api',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      withCredentials: true,
    });

    this.client.addResponseTransform((response) => {
      response.data = camelizeResponse(response.data);
    });

    this.client.addRequestTransform((request) => {
      request.headers['X-CSRF-Token'] = getCsrfToken();
      request.params = decamelizeRequest(request.params);
      request.data = decamelizeRequest(request.data);
    });

    this.client.addRequestTransform((request) => {
      const persistedSandboxValues = JSON.parse(localStorage.getItem('SandboxStore'));
      request.headers['X-Sandbox-ID'] = persistedSandboxValues?.currentSandboxId;
    });
  }

  addMonitor(monitor: Monitor) {
    this.client.addMonitor(monitor);
  }

  async resendConfirmation(userId: string) {
    return this.client.post<ApiResponse<IUser>>(`/users/${userId}/resend_confirmation`);
  }

  async reinviteUser(userId: string) {
    return this.client.post<ApiResponse<IUser>>(`/users/${userId}/reinvite`);
  }

  async logout() {
    return this.client.delete('/logout');
  }

  async validateToken() {
    return this.client.get('/validate_token');
  }

  async invite(params) {
    return this.client.post('/invitation', params);
  }

  async acceptInvitation(userId: string, params) {
    return this.client.post<IAcceptInvitationResponse>(`/users/${userId}/accept_invitation`, params);
  }

  async fetchInvitedUser(token: string, programId) {
    return this.client.get<ApiResponse<IUser>>(`/programs/${programId}/invitations/${token}`);
  }

  async searchPrograms(params?: TSearchParams<EProgramSortFields, IJurisdictionSearchFilters>) {
    return this.client.post<IProgramResponse>('/programs/search', params);
  }

  async searchJurisdictions(params?: TSearchParams<EJurisdictionSortFields, IJurisdictionSearchFilters>) {
    return this.client.post<IJurisdictionResponse>('/jurisdictions/search', params);
  }

  async fetchJurisdiction(id) {
    return this.client.get<ApiResponse<IJurisdiction>>(`/jurisdictions/${id}`);
  }

  async fetchProgram(id) {
    return this.client.get<ApiResponse<IProgram>>(`/programs/${id}`);
  }

  async fetchPermitApplication(id: string, review?: boolean) {
    return this.client.get<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}`, { review });
  }

  async viewPermitApplication(id) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}/mark_as_viewed`);
  }
  async setPermitApplicationStatus(id, params) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}/change_status`, params);
  }
  async fetchLocalityTypeOptions() {
    return this.client.get<IOptionResponse>(`/jurisdictions/locality_type_options`);
  }

  async fetchContactOptions(query) {
    return this.client.get<IOptionResponse<IContact>>(`/contacts/contact_options`, { query });
  }

  async fetchJurisdictionOptions(filters: IJurisdictionFilters) {
    return this.client.get<IOptionResponse>(`/jurisdictions/jurisdiction_options`, {
      jurisdiction: { ...filters },
    });
  }

  async fetchProgramOptions(filters: IJurisdictionFilters) {
    return this.client.get<IOptionResponse>(`/programs/program_options`, {
      program: { ...filters },
    });
  }

  async fetchPermitClassifications() {
    return this.client.get<IOptionResponse<IContact>>(`/permit_classifications`);
  }

  async fetchPermitClassificationOptions(
    type,
    published = false,
    firstNations = false,
    permitTypeId: string = null,
    activityId: string = null,
    pid: string = null,
    jurisdictionId: string = null,
  ) {
    return this.client.post<
      IOptionResponse<IPermitType | IActivity | IAudienceType | IUserGroupType | ISubmissionType>
    >(`/permit_classifications/permit_classification_options`, {
      type,
      published,
      firstNations,
      permitTypeId,
      activityId,
      pid,
      jurisdictionId,
    });
  }

  async createJurisdiction(params) {
    return this.client.post<ApiResponse<IJurisdiction>>('/jurisdictions', { jurisdiction: params });
  }

  async createProgram(params) {
    return this.client.post<ApiResponse<IProgram>>('/programs', { program: params });
  }

  async updateJurisdiction(id, params) {
    return this.client.patch<ApiResponse<IJurisdiction>>(`/jurisdictions/${id}`, { jurisdiction: params });
  }

  async updateProgram(id, params) {
    return this.client.patch<ApiResponse<IJurisdiction>>(`/programs/${id}`, { program: params });
  }

  async inviteUsersToProgram(id: string, users: TInviteUserParams[]) {
    return this.client.post<ApiResponse<any>>(`/programs/${id}/invitations`, {
      users,
    });
  }

  async updateJurisdictionExternalApiEnabled(id: string, externalApiEnabled: boolean) {
    return this.client.patch<ApiResponse<IJurisdiction>>(`/jurisdictions/${id}/update_external_api_enabled`, {
      externalApiEnabled: externalApiEnabled,
    });
  }

  async updateProgramExternalApiEnabled(id: string, externalApiEnabled: boolean) {
    return this.client.patch<ApiResponse<IProgram>>(`/programs/${id}/update_external_api_enabled`, {
      externalApiEnabled: externalApiEnabled,
    });
  }

  async fetchRequirementBlocks(params?: TSearchParams<ERequirementLibrarySortFields>) {
    return this.client.post<IRequirementBlockResponse>('/requirement_blocks/search', params);
  }

  async fetchJurisdictionUsers(jurisdictionId, params?: TSearchParams<EUserSortFields>) {
    return this.client.post<IUsersResponse>(`/jurisdictions/${jurisdictionId}/users/search`, params);
  }

  async fetchUsersByProgram(
    programId,
    params?: TSearchParams<EActiveUserSortFields | EPendingUserSortFields | EDeactivatedUserSortFields>,
  ) {
    return this.client.post<IUsersResponse>(`/programs/${programId}/users/search`, params);
  }

  async fetchAdminUsers(
    params?: TSearchParams<EActiveUserSortFields | EPendingUserSortFields | EDeactivatedUserSortFields>,
  ) {
    return this.client.post<IUsersResponse>(`/users/search`, params);
  }

  async syncProgramClassifications(programId, params?: ISyncClassificationsParams) {
    return this.client.patch<ApiResponse<any>>(
      `/programs/${programId}/program_classification_memberships/sync`,
      params,
    );
  }

  ay;

  async fetchPermitApplications(params?: TSearchParams<EPermitApplicationSortFields, IPermitApplicationSearchFilters>) {
    return this.client.post<IJurisdictionPermitApplicationResponse>(`/permit_applications/search`, params);
  }

  async fetchCollaboratorsByCollaboratorable(collaboratorableId: string, params?: TSearchParams<never, never>) {
    return this.client.post<ICollaboratorSearchResponse>(
      `/collaborators/collaboratorable/${collaboratorableId}/search`,
      params,
    );
  }

  async fetchProgramPermitApplications(
    programId,
    params?: TSearchParams<EPermitApplicationSortFields, IPermitApplicationSearchFilters>,
  ) {
    return this.client.post<IJurisdictionPermitApplicationResponse>(
      `/programs/${programId}/permit_applications/search`,
      params,
    );
  }

  async createPermitApplication(params: TCreatePermitApplicationFormData) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>('/permit_applications', {
      permitApplication: params,
    });
  }

  async createEnergyApplication(params: TCreateEnergyApplicationFormData) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>('/esp_application', params, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createRequirementBlock(params: IRequirementBlockParams) {
    return this.client.post<IRequirementBlockResponse>(`/requirement_blocks`, { requirementBlock: params });
  }

  async updateRequirementBlock(id: string, params: Partial<IRequirementBlockParams>) {
    return this.client.put<IRequirementBlockResponse>(`/requirement_blocks/${id}`, { requirementBlock: params });
  }

  async archiveRequirementBlock(id: string) {
    return this.client.delete<IRequirementBlockResponse>(`/requirement_blocks/${id}`);
  }

  async restoreRequirementBlock(id: string) {
    return this.client.post<IRequirementBlockResponse>(`/requirement_blocks/${id}/restore`);
  }

  async updateProfile(params) {
    return this.client.patch<ApiResponse<IUser>>('/profile', { user: params });
  }

  async removeUserFromProgram(id) {
    return this.client.patch<ApiResponse<IUser>>(`/program_memberships/${id}/deactivate`);
  }

  async restoreUserToProgram(id) {
    return this.client.patch<ApiResponse<IUser>>(`/program_memberships/${id}/reactivate`);
  }

  async destroyUser(id) {
    return this.client.delete<ApiResponse<IUser>>(`/users/${id}`);
  }

  async restoreUser(id) {
    return this.client.patch<ApiResponse<IUser>>(`/users/${id}/restore`);
  }

  async acceptEULA(userId: string) {
    return this.client.patch<ApiResponse<IUser>>(`/users/${userId}/accept_eula`);
  }

  async updateUserRole(id: string, role: string) {
    return this.client.patch<ApiResponse<IUser>>(`/users/${id}/role`, { role });
  }

  async getEULA() {
    return this.client.get('/end_user_license_agreement');
  }

  async searchTags(params: Partial<ITagSearchParams>) {
    return this.client.post<string[]>(`/tags/search`, { search: params });
  }

  async fetchAutoComplianceModuleConfigurations() {
    return this.client.get<ApiResponse<TAutoComplianceModuleConfigurations>>(
      '/requirement_blocks/auto_compliance_module_configurations',
    );
  }

  async updatePermitApplication(id, params, review?: boolean) {
    console.log('Updating permit application with params:', params);
    return this.client.patch<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}`, {
      permitApplication: params,
      review,
    });
  }

  async updateRevisionRequests(id, params: IRevisionRequestForm) {
    return this.client.patch<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}/revision_requests`, {
      submissionVersion: params,
    });
  }

  async updatePermitApplicationVersion(id) {
    return this.client.patch<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}/update_version`);
  }

  async assignCollaboratorToPermitApplication(
    permitApplicationId: string,
    params: {
      collaboratorId: string;
      collaboratorType: ECollaboratorType;
      assignedRequirementBlockId?: string;
    },
  ) {
    return this.client.post<ApiResponse<IPermitCollaboration>>(
      `/permit_applications/${permitApplicationId}/permit_collaborations`,
      {
        permitCollaboration: params,
      },
    );
  }

  async assignUserToApplication(
    permitApplicationId: string,
    params: {
      userId: string;
    },
  ) {
    return this.client.post<ApiResponse<IPermitCollaboration>>(
      `/permit_applications/${permitApplicationId}/application_assignments`,
      {
        applicationAssignment: params,
      },
    );
  }

  async removeCollaboratorCollaborationsFromPermitApplication(
    permitApplicationId: string,
    {
      collaboratorId,
      collaboratorType,
      collaborationType,
    }: {
      collaboratorId: string;
      collaboratorType: ECollaboratorType;
      collaborationType: ECollaborationType;
    },
  ) {
    return this.client.delete<ApiResponse<IPermitCollaboration>>(
      `/permit_applications/${permitApplicationId}/permit_collaborations/remove_collaborator_collaborations`,
      {
        collaboratorId,
        collaboratorType,
        collaborationType,
      },
    );
  }

  async createOrUpdatePermitBlockStatus(
    permitApplicationId: string,
    {
      requirementBlockId,
      collaborationType,
      status,
    }: {
      requirementBlockId: string;
      collaborationType: ECollaborationType;
      status: EPermitBlockStatus;
    },
  ) {
    return this.client.post<ApiResponse<IPermitCollaboration>>(
      `/permit_applications/${permitApplicationId}/permit_block_status`,
      {
        requirementBlockId,
        status,
        collaborationType,
      },
    );
  }

  async inviteNewCollaboratorToPermitApplication(
    permitApplicationId: string,
    params: {
      user: {
        email: string;
        firstName: string;
        lastName: string;
      };
      collaboratorType: ECollaboratorType;
      assignedRequirementBlockId?: string;
    },
  ) {
    return this.client.post<ApiResponse<IPermitCollaboration>>(
      `/permit_applications/${permitApplicationId}/permit_collaborations/invite`,
      {
        collaboratorInvite: params,
      },
    );
  }

  async unassignPermitCollaboration(id: string) {
    return this.client.delete<ApiResponse<IPermitCollaboration>>(`/permit_collaborations/${id}`);
  }

  async reinvitePermitCollaboration(permitCollaborationId: string) {
    return this.client.post<ApiResponse<IPermitCollaboration>>(
      `/permit_collaborations/${permitCollaborationId}/reinvite`,
    );
  }

  async generatePermitApplicationMissingPdfs(id: string) {
    return this.client.post<never>(`/permit_applications/${id}/generate_missing_pdfs`);
  }

  async submitPermitApplication(id, params) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>(`/permit_applications/${id}/submit`, {
      permitApplication: params,
    });
  }

  async deletePermitApplication(id: string) {
    return this.client.delete(`/permit_applications/${id}`);
  }

  async finalizeRevisionRequests(id) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>(
      `/permit_applications/${id}/revision_requests/finalize`,
    );
  }

  async removeRevisionRequests(id) {
    return this.client.post<ApiResponse<IEnergySavingsApplication>>(
      `/permit_applications/${id}/revision_requests/remove`,
      {
        submission_version: {
          revision_requests_attributes: [],
        },
      },
    );
  }

  async fetchRequirementTemplates(
    params?: TSearchParams<ERequirementTemplateSortFields | EEarlyAccessRequirementTemplateSortFields>,
  ) {
    return this.client.post<IRequirementTemplateResponse>(`/requirement_templates/search`, params);
  }

  async fetchRequirementTemplate(id: string) {
    return this.client.get<IApiResponse<IRequirementTemplate, {}>>(`/requirement_templates/${id}`);
  }

  async createRequirementTemplate(params: TCreateRequirementTemplateFormData) {
    return this.client.post<ApiResponse<IRequirementTemplate>>(`/requirement_templates`, {
      requirementTemplate: params,
    });
  }

  async copyRequirementTemplate(params?: ICopyRequirementTemplateFormData) {
    return this.client.post<ApiResponse<IRequirementTemplate>>(`/requirement_templates/copy`, {
      requirementTemplate: params,
    });
  }

  async updateRequirementTemplate(templateId: string, params: IRequirementTemplateUpdateParams) {
    return this.client.put<ApiResponse<IRequirementTemplate>>(`/requirement_templates/${templateId}`, {
      requirementTemplate: params,
    });
  }

  async invitePreviewers(templateId: string, params: IInvitePreviewersParams) {
    return this.client.post<ApiResponse<IRequirementTemplate>>(
      `/requirement_templates/${templateId}/invite_previewers`,
      params,
    );
  }

  async revokeEarlyAccess(previewId: string) {
    return this.client.post<ApiResponse<IEarlyAccessPreview>>(`/early_access_previews/${previewId}/revoke_access`);
  }

  async unrevokeEarlyAccess(previewId: string) {
    return this.client.post<ApiResponse<IEarlyAccessPreview>>(`/early_access_previews/${previewId}/unrevoke_access`);
  }

  async extendEarlyAccess(previewId: string) {
    return this.client.post<ApiResponse<IEarlyAccessPreview>>(`/early_access_previews/${previewId}/extend_access`);
  }

  // we send the versionDate as string instead of date as we want to strip off timezone info
  async scheduleRequirementTemplate(
    templateId: string,
    {
      requirementTemplate,
      versionDate,
    }: {
      requirementTemplate?: IRequirementTemplateUpdateParams;
      versionDate: string;
    },
  ) {
    return this.client.post<ApiResponse<IRequirementTemplate>>(`/requirement_templates/${templateId}/schedule`, {
      requirementTemplate,
      versionDate,
    });
  }

  async forcePublishRequirementTemplate(templateId: string, requirementTemplate: IRequirementTemplateUpdateParams) {
    return this.client.post<ApiResponse<IRequirementTemplate>>(
      `/requirement_templates/${templateId}/force_publish_now`,
      {
        requirementTemplate,
      },
    );
  }

  async fetchSiteOptions(address: string) {
    //fetch list of locations, returns siteIds (in some cases blank)
    return this.client.get<IOptionResponse>(`/geocoder/site_options`, { address });
  }

  async fetchGeocodedJurisdiction(siteId: string, pid: string = null) {
    return this.client.get<IOptionResponse>(`/geocoder/jurisdiction`, { siteId, pid });
  }

  async fetchPids(siteId: string) {
    return this.client.get<ApiResponse<string>>(`/geocoder/pids`, { siteId });
  }

  async fetchSiteDetailsFromPid(pid: string) {
    return this.client.get<ApiResponse<string>>(`/geocoder/pid_details`, { pid });
  }

  async fetchPin(pin: string) {
    return this.client.get<ApiResponse<string>>(`/geocoder/pin`, { pin });
  }

  async destroyRequirementTemplate(id) {
    return this.client.delete<ApiResponse<IRequirementTemplate>>(`/requirement_templates/${id}`);
  }

  async restoreRequirementTemplate(id) {
    return this.client.patch<ApiResponse<IRequirementTemplate>>(`/requirement_templates/${id}/restore`);
  }

  async fetchTemplateVersions(
    activityId?: string,
    status?: ETemplateVersionStatus,
    earlyAccess?: boolean,
    isPublic?: boolean,
  ) {
    return this.client.get<ApiResponse<ITemplateVersion[]>>(`/template_versions`, {
      activityId,
      status,
      earlyAccess,
      public: isPublic,
    });
  }

  async fetchTemplateVersionCompare(templateVersionId: string, previousVersionId?: string) {
    const params = previousVersionId ? { previousVersionId } : {};

    return this.client.get<ApiResponse<ITemplateVersionDiff>>(
      `/template_versions/${templateVersionId}/compare_requirements`,
      params,
    );
  }

  async fetchTemplateVersion(id: string) {
    return this.client.get<ApiResponse<ITemplateVersion>>(`/template_versions/${id}`);
  }

  async fetchJurisdictionTemplateVersionCustomization(templateId: string, jurisdictionId: string) {
    return this.client.get<ApiResponse<IJurisdictionTemplateVersionCustomization>>(
      `/template_versions/${templateId}/jurisdictions/${jurisdictionId}/jurisdiction_template_version_customization`,
    );
  }

  async fetchIntegrationMapping(templateId: string, jurisdictionId: string) {
    return this.client.get<ApiResponse<IIntegrationMapping>>(
      `/template_versions/${templateId}/jurisdictions/${jurisdictionId}/integration_mapping`,
    );
  }

  async updateIntegrationMapping(id: string, params: IIntegrationMappingUpdateParams) {
    return this.client.patch<ApiResponse<IIntegrationMapping>>(`/integration_mappings/${id}`, {
      integrationMapping: params,
    });
  }

  async createOrUpdateJurisdictionTemplateVersionCustomization(
    templateId: string,
    jurisdictionId: string,
    jurisdictionTemplateVersionCustomization: IJurisdictionTemplateVersionCustomizationForm,
  ) {
    return this.client.post<ApiResponse<IJurisdictionTemplateVersionCustomization>>(
      `/template_versions/${templateId}/jurisdictions/${jurisdictionId}/jurisdiction_template_version_customization`,
      { jurisdictionTemplateVersionCustomization },
    );
  }

  async promoteJurisdictionTemplateVersionCustomization(templateId: string, jurisdictionId: string) {
    return this.client.post<ApiResponse<IJurisdictionTemplateVersionCustomization>>(
      `/template_versions/${templateId}/jurisdictions/${jurisdictionId}/jurisdiction_template_version_customization/promote`,
    );
  }

  async unscheduleTemplateVersion(templateId: string) {
    return this.client.post<ApiResponse<ITemplateVersion>>(
      `requirement_templates/template_versions/${templateId}/unschedule`,
    );
  }

  async fetchStepCodes() {
    return this.client.get<ApiResponse<IStepCode[]>>('/step_codes');
  }

  async createStepCode(stepCode: IStepCode) {
    return this.client.post<ApiResponse<IStepCode>>('/step_codes', { stepCode });
  }

  async deleteStepCode(id: string) {
    return this.client.delete<ApiResponse<IStepCode>>(`/step_codes/${id}`);
  }

  async downloadStepCodeSummaryCsv() {
    return this.client.get<BlobPart>(`/step_codes/download_step_code_summary_csv`);
  }

  async downloadApplicationMetricsCsv() {
    return this.client.get<BlobPart>(`/permit_applications/download_application_metrics_csv`);
  }

  async fetchStepCodeChecklist(id: string) {
    return this.client.get<ApiResponse<IStepCodeChecklist>>(`/step_code_checklists/${id}`);
  }

  async updateStepCodeChecklist(id: string, stepCodeChecklist: IStepCodeChecklist) {
    return this.client.patch<ApiResponse<IStepCode>>(`/step_code_checklists/${id}`, { stepCodeChecklist });
  }

  async fetchSiteConfiguration() {
    return this.client.get<ApiResponse<ISiteConfigurationStore>>(`/site_configuration`, {});
  }

  async fetchExternalApiKeys(programId: string) {
    return this.client.get<ApiResponse<IExternalApiKey[]>>(`/external_api_keys/`, { programId });
  }

  async fetchExternalApiKey(externalApiKeyId: string) {
    return this.client.get<ApiResponse<IExternalApiKey>>(`/external_api_keys/${externalApiKeyId}`);
  }

  async createExternalApiKey(externalApiKey: IExternalApiKeyParams) {
    return this.client.post<ApiResponse<IExternalApiKey>>(`/external_api_keys/`, { externalApiKey });
  }

  async updateExternalApiKey(externalApiKeyId: string, externalApiKey: IExternalApiKeyParams) {
    return this.client.patch<ApiResponse<IExternalApiKey>>(`/external_api_keys/${externalApiKeyId}`, {
      externalApiKey,
    });
  }

  async revokeExternalApiKey(externalApiKeyId: string) {
    return this.client.post<ApiResponse<IExternalApiKey>>(`/external_api_keys/${externalApiKeyId}/revoke`);
  }

  async updateSiteConfiguration(siteConfiguration) {
    return this.client.put<ApiResponse<ISiteConfigurationStore>>(`/site_configuration`, { siteConfiguration });
  }

  async updateUser(id: string, user: IUser) {
    return this.client.patch<ApiResponse<IUser>>(`/users/${id}`, { user });
  }

  async fetchSuperAdmins() {
    return this.client.get<IOptionResponse>(`/users/super_admins`, {});
  }

  async getUsersActivePrograms() {
    return this.client.get<IOptionResponse>(`/users/active_programs`, {});
  }

  async createContact(params: TContactFormData) {
    return this.client.post<ApiResponse<IContact>>('/contacts', { contact: params });
  }

  async updateContact(id: string, params: TContactFormData) {
    return this.client.put<ApiResponse<IContact>>(`/contacts/${id}`, { contact: params });
  }

  async destroyContact(id: string) {
    return this.client.delete<ApiResponse<IContact>>(`/contacts/${id}`);
  }

  async downloadCustomizationJson(templateVersionId: string, jurisdictionId: string) {
    return this.client.get<BlobPart>(
      `/template_versions/${templateVersionId}/jurisdictions/${jurisdictionId}/download_customization_json`,
    );
  }

  async downloadCustomizationCsv(templateVersionId: string, jurisdictionId: string) {
    return this.client.get<BlobPart>(
      `/template_versions/${templateVersionId}/jurisdictions/${jurisdictionId}/download_customization_csv`,
    );
  }

  async copyJurisdictionTemplateVersionCustomization(
    templateVersionId: string,
    jurisdictionId: string,
    includeElectives: boolean,
    includeTips: boolean,
    fromNonFirstNations?: boolean,
    fromTemplateVersionId?: string,
  ) {
    return this.client.post<ApiResponse<IJurisdictionTemplateVersionCustomization>>(
      `/template_versions/${templateVersionId}/jurisdictions/${jurisdictionId}/copy_jurisdiction_template_version_customization`,
      { includeElectives, includeTips, fromTemplateVersionId, fromNonFirstNations },
    );
  }

  async downloadRequirementSummaryCsv(templateVersionId: string) {
    return this.client.get<BlobPart>(`/template_versions/${templateVersionId}/download_requirement_summary_csv`);
  }

  async fetchNotifications(page: number) {
    return this.client.get<INotificationResponse>(`/notifications`, { page });
  }

  deleteNotification(notificationId: string) {
    return this.client.delete(`/notifications/${notificationId}`);
  }

  async clearAllNotifications() {
    return this.client.delete<ApiResponse<null>>('/notifications/clear_all');
  }

  async resetLastReadNotifications() {
    return this.client.post(`/notifications/reset_last_read`);
  }

  async fetchCurrentUserAcceptedEulas() {
    return this.client.get<ApiResponse<IUser>>(`/users/current_user/license_agreements`);
  }
}
