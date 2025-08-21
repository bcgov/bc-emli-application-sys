import { t } from 'i18next';
import { flow, Instance, types } from 'mobx-state-tree';
import * as R from 'ramda';
import { TCreatePermitApplicationFormData } from '../components/domains/energy-savings-application/new-energy-savings-application-screen';
import { TCreateEnergyApplicationFormData } from '../components/domains/energy-savings-application/new-application';
import { createSearchModel } from '../lib/create-search-model';
import { withEnvironment } from '../lib/with-environment';
import { withMerge } from '../lib/with-merge';
import { withRootStore } from '../lib/with-root-store';
import { EnergySavingsApplicationModel, IEnergySavingsApplication } from '../models/energy-savings-application';
import { IJurisdiction } from '../models/jurisdiction';
import { IPermitBlockStatus } from '../models/permit-block-status';
import { IRequirementTemplate } from '../models/requirement-template';
import { IUser } from '../models/user';
import { cast } from 'mobx-state-tree';
import {
  ECustomEvents,
  EPermitApplicationSocketEventTypes,
  EPermitApplicationSortFields,
  EPermitApplicationStatus,
  EPermitApplicationStatusGroup,
  EPermitClassificationCode,
} from '../types/enums';
import {
  IEnergySavingsApplicationComplianceUpdate,
  IEnergySavingsApplicationSearchFilters,
  IEnergySavingsApplicationSupportingDocumentsUpdate,
  IMinimalFrozenUser,
  IPermitApplicationSupportingDocumentsUpdate,
  IUserPushPayload,
  TSearchParams,
} from '../types/types';
import { convertResourceArrayToRecord, setQueryParam } from '../utils/utility-functions';

const filterableStatus = Object.values(EPermitApplicationStatus);
export type TFilterableStatus = (typeof filterableStatus)[number];

export const PermitApplicationStoreModel = types
  .compose(
    types.model('PermitApplicationStore', {
      permitApplicationMap: types.map(EnergySavingsApplicationModel),
      tablePermitApplications: types.array(types.reference(EnergySavingsApplicationModel)),
      currentPermitApplication: types.maybeNull(types.reference(EnergySavingsApplicationModel)),
      statusFilter: types.optional(types.array(types.enumeration(filterableStatus)), [
        EPermitApplicationStatus.draft,
        EPermitApplicationStatus.submitted,
        EPermitApplicationStatus.inReview,
        EPermitApplicationStatus.approved,
        EPermitApplicationStatus.ineligible,
        EPermitApplicationStatus.revisionsRequested,
      ]),
      userGroupTypeIdFilter: types.maybeNull(types.string),
      submissionTypeIdFilter: types.maybeNull(types.array(types.string)),
      audienceTypeIdFilter: types.maybeNull(types.array(types.string)),
      submitterFilter: types.maybeNull(types.string),
      auditUserFilter: types.maybeNull(types.string),
      templateVersionIdFilter: types.maybeNull(types.string),
      requirementTemplateIdFilter: types.maybeNull(types.string),
      assignedUserIdFilter: types.maybeNull(types.string),
    }),
    createSearchModel<EPermitApplicationSortFields>('searchPermitApplications', 'setPermitApplicationFilters'),
  )
  .extend(withEnvironment())
  .extend(withRootStore())
  .extend(withMerge())
  .views((self) => ({
    get draftStatuses() {
      return [EPermitApplicationStatus.draft];
    },
    get submittedStatuses() {
      return [EPermitApplicationStatus.submitted];
    },
  }))
  .views((self) => ({
    getSortColumnHeader(field: EPermitApplicationSortFields) {
      // @ts-ignore
      return t(`permitApplication.columns.${field}`);
    },
    // View to get a PermitApplication by id
    getPermitApplicationById(id: string) {
      return self.permitApplicationMap.get(id);
    },
    // View to get all permitapplications as an array
    get permitApplications() {
      // TODO: UNSTUB APPLICATIONS
      return Array.from(self.permitApplicationMap.values());
    },
    get hasResetableFilters() {
      return !R.isNil(self.templateVersionIdFilter) || !R.isNil(self.requirementTemplateIdFilter);
    },
    get statusFilterToGroup(): EPermitApplicationStatusGroup {
      const map = {
        [self.draftStatuses.join(',')]: EPermitApplicationStatusGroup.draft,
        [self.submittedStatuses.join(',')]: EPermitApplicationStatusGroup.submitted,
        [self.submittedStatuses.join(',')]: EPermitApplicationStatusGroup.inReview,
        [self.submittedStatuses.join(',')]: EPermitApplicationStatusGroup.approved,
        [self.submittedStatuses.join(',')]: EPermitApplicationStatusGroup.ineligible,
        [self.submittedStatuses.join(',')]: EPermitApplicationStatusGroup.revisionsRequested,
      };
      return map[self.statusFilter.join(',')];
    },
  }))
  .actions((self) => ({
    setCurrentPermitApplication(permitApplicationId) {
      self.currentPermitApplication = permitApplicationId;
      self.currentPermitApplication &&
        self.rootStore.stepCodeStore.setCurrentStepCode(self.currentPermitApplication.stepCode);
    },
    resetCurrentPermitApplication() {
      self.currentPermitApplication = null;
      self.rootStore.stepCodeStore.setCurrentStepCode(null);
    },
    __beforeMergeUpdate(permitApplicationData) {
      const pad = permitApplicationData;

      if (!pad.skipAssociationMerges) {
        pad.sandbox && self.rootStore.sandboxStore.mergeUpdate(pad.sandbox, 'sandboxMap');
        pad.stepCode && self.rootStore.stepCodeStore.mergeUpdate(pad.stepCode, 'stepCodesMap');
        pad.jurisdiction && self.rootStore.jurisdictionStore.mergeUpdate(pad.jurisdiction, 'jurisdictionMap');
        pad.submitter && self.rootStore.userStore.mergeUpdate(pad.submitter, 'usersMap');
        pad.templateVersion &&
          self.rootStore.templateVersionStore.mergeUpdate(pad.templateVersion, 'templateVersionMap');
        pad.publishedTemplateVersion &&
          self.rootStore.templateVersionStore.mergeUpdate(pad.publishedTemplateVersion, 'templateVersionMap');
        pad.permitCollaborations &&
          self.rootStore.collaboratorStore.mergeUpdateAll(
            // @ts-ignore
            R.map(R.prop('collaborator'), pad.permitCollaborations),
            'collaboratorMap',
          );
      }

      return R.mergeRight(pad, {
        sandbox: pad.sandbox?.id,
        jurisdiction: pad.jurisdiction?.id,
        submitter: pad.submitter?.id,
        templateVersion: pad.templateVersion?.id,
        publishedTemplateVersion: pad.publishedTemplateVersion?.id,
        stepCode: pad.stepCode?.id,
      });
    },
    __beforeMergeUpdateAll(permitApplicationsData) {
      //find all unique jurisdictions
      const jurisdictionsUniq = R.uniqBy(
        (j: IJurisdiction) => j.id,
        permitApplicationsData.filter((pa) => pa.jurisdiction).map((pa) => pa.jurisdiction),
      );
      self.rootStore.jurisdictionStore.mergeUpdateAll(jurisdictionsUniq, 'jurisdictionMap');

      //find all unique submitters
      const submittersUniq = R.uniqBy(
        (u: IUser) => u.id,
        permitApplicationsData.filter((pa) => pa.submitter).map((pa) => pa.submitter),
      );
      self.rootStore.userStore.mergeUpdateAll(submittersUniq, 'usersMap');

      self.rootStore.templateVersionStore.mergeUpdateAll(
        R.reject(
          R.isNil,
          permitApplicationsData.map((pa) => pa.templateVersion),
        ),
        'templateVersionMap',
      );

      self.rootStore.templateVersionStore.mergeUpdateAll(
        R.reject(
          R.isNil,
          permitApplicationsData.map((pa) => pa.publishedTemplateVersion),
        ),
        'templateVersionMap',
      );

      self.rootStore.stepCodeStore.mergeUpdateAll(
        R.reject(
          R.isNil,
          permitApplicationsData.map((pa) => pa.stepCode),
        ),
        'stepCodesMap',
      );

      self.rootStore.collaboratorStore.mergeUpdateAll(
        // @ts-ignore
        R.pipe(
          R.map(R.prop('permitCollaborations')),
          R.reject(R.isNil),
          R.flatten,
          R.map(R.prop('collaborator')),
          R.uniqBy((c) => c.id),
        )(permitApplicationsData),
        'collaboratorMap',
      );

      // Already merged associations here.
      // Since beforeMergeUpdateAll internally uses beforeMergeUpdate, we need to skip the association merges
      // to reduce duplication of work

      permitApplicationsData.skipAssociationMerges = true;

      return permitApplicationsData;
    },
  }))
  .actions((self) => ({
    setTablePermitApplications: (permitApplications) => {
      self.tablePermitApplications = permitApplications.map((pa) => pa.id);
    },

    // Action to add a new PermitApplication
    addPermitApplication(permitapplication: IEnergySavingsApplication) {
      self.permitApplicationMap.put(permitapplication);
    },
    setStatusFilter(statuses: TFilterableStatus[] | undefined) {
      if (!statuses) return;
      setQueryParam('status', statuses);
      // @ts-ignore
      self.statusFilter = statuses;
    },
    setUserGroupFilter(id: string) {
      if (!id) return;
      // setQueryParam('user_group_type_id', id);
      // @ts-ignore
      self.userGroupTypeIdFilter = id;
    },
    setSubmissionTypeFilter(id: string | string[]) {
      if (!id || (Array.isArray(id) && id.length === 0)) return;

      const ids = Array.isArray(id) ? id : [id];
      const joinedIds = ids.join(',');

      // @ts-ignor"
      self.submissionTypeIdFilter = cast(ids);
    },

    setAudienceTypeFilter(id: string | string[]) {
      if (!id || (Array.isArray(id) && id.length === 0)) return;

      const ids = Array.isArray(id) ? id : [id];
      const joinedIds = ids.join(',');

      // @ts-ignor"
      self.audienceTypeIdFilter = cast(ids);
    },
    setAssignedUserIdFilter(userId: string | null) {
      // @ts-ignore
      self.assignedUserIdFilter = userId;
    },
  }))
  .actions((self) => ({
    getEphemeralPermitApplication(
      requirementTemplate: IRequirementTemplate,
      overrides: Partial<IEnergySavingsApplication> = {},
    ) {
      if (self.currentPermitApplication?.isEphemeral) return self.currentPermitApplication;
      const permitApplication = EnergySavingsApplicationModel.create({
        id: `ephemeral-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nickname: overrides.nickname || 'Ephemeral Application',
        number: overrides.number || '',
        fullAddress: overrides.fullAddress || null,
        pin: overrides.pin || null,
        pid: overrides.pid || null,
        permitType: requirementTemplate.permitType || overrides.permitType || {}, // Provide default or empty objects as needed
        activity: requirementTemplate.activity || overrides.activity || {},
        status: overrides.status || EPermitApplicationStatus.ephemeral,
        submitter: overrides.submitter || self.rootStore.userStore.currentUser?.id || null,
        jurisdiction: overrides.jurisdiction || null,
        templateVersion: requirementTemplate.publishedTemplateVersion || overrides.templateVersion || null,
        publishedTemplateVersion:
          requirementTemplate.publishedTemplateVersion || overrides.publishedTemplateVersion || null,
        formJson: overrides.formJson || requirementTemplate.publishedTemplateVersion.formJson,
        submissionData: overrides.submissionData || null,
        formattedComplianceData: overrides.formattedComplianceData || null,
        formCustomizations: {} || overrides.formCustomizations || null,
        submittedAt: overrides.submittedAt || null,
        resubmittedAt: overrides.resubmittedAt || null,
        revisionsRequestedAt: overrides.revisionsRequestedAt || null,
        selectedTabIndex: overrides.selectedTabIndex ?? 0,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
        stepCode: overrides.stepCode || null,
        supportingDocuments: overrides.supportingDocuments || null,
        allSubmissionVersionCompletedSupportingDocuments:
          overrides.allSubmissionVersionCompletedSupportingDocuments || null,
        zipfileSize: overrides.zipfileSize || null,
        zipfileName: overrides.zipfileName || null,
        zipfileUrl: overrides.zipfileUrl || null,
        referenceNumber: overrides.referenceNumber || null,
        missingPdfs: overrides.missingPdfs || null,
        isFullyLoaded: overrides.isFullyLoaded ?? false,
        isDirty: overrides.isDirty ?? false,
        isLoading: overrides.isLoading ?? false,
        indexedUsingCurrentTemplateVersion: overrides.indexedUsingCurrentTemplateVersion || null,
        showingCompareAfter: overrides.showingCompareAfter ?? false,
        revisionMode: overrides.revisionMode ?? false,
        diff: overrides.diff || null,
        submissionVersions: overrides.submissionVersions || [],
        selectedPastSubmissionVersion: overrides.selectedPastSubmissionVersion || null,
        permitCollaborationMap: overrides.permitCollaborationMap || {},
        permitBlockStatusMap: overrides.permitBlockStatusMap || {},
        isViewingPastRequests: overrides.isViewingPastRequests ?? false,
        // Initialize maps properly if overrides provide arrays
        ...(overrides.permitCollaborations && {
          permitCollaborationMap: convertResourceArrayToRecord(overrides.permitCollaborations),
        }),
        ...(overrides.permitBlockStatuses && {
          permitBlockStatusMap: convertResourceArrayToRecord(overrides.permitBlockStatuses),
        }),
      });

      self.addPermitApplication(permitApplication);
      self.setCurrentPermitApplication(permitApplication.id);

      return self.currentPermitApplication;
    },
  }))
  .actions((self) => ({
    createEnergyApplication: flow(function* (formData: TCreateEnergyApplicationFormData) {
      const { ok, data: response } = yield self.environment.api.createEnergyApplication(formData);
      if (ok && response.id) {
        return response.id;
      }
      return false;
    }),
    createPermitApplication: flow(function* (formData: TCreatePermitApplicationFormData) {
      const { ok, data: response } = yield self.environment.api.createPermitApplication(formData);
      if (ok && response.data) {
        self.mergeUpdate(response.data, 'permitApplicationMap');
        return response.data;
      }
      return false;
    }),
    // Action to remove a PermitApplication
    removePermitApplication(id: string) {
      if (self.currentPermitApplication?.id === id) {
        self.resetCurrentPermitApplication();
      }
      self.permitApplicationMap.delete(id);
    },
    searchPermitApplications: flow(function* (opts?: { reset?: boolean; page?: number; countPerPage?: number }) {
      if (opts?.reset) {
        self.resetPages();
      }

      const searchParams = {
        query: self.query,
        sort: self.sort,
        page: opts?.page ?? self.currentPage,
        perPage: opts?.countPerPage ?? self.countPerPage,
        filters: {
          status: self.statusFilter,
          userGroupTypeId: self.userGroupTypeIdFilter,
          submissionTypeId: self.submissionTypeIdFilter,
          audienceTypeId: self.audienceTypeIdFilter,
          templateVersionId: self.templateVersionIdFilter,
          requirementTemplateId: self.requirementTemplateIdFilter,
        },
      } as TSearchParams<EPermitApplicationSortFields, IEnergySavingsApplicationSearchFilters>;

      const currentProgramId = self.rootStore?.programStore?.currentProgram?.id;
      const response = currentProgramId
        ? yield self.environment.api.fetchProgramPermitApplications(currentProgramId, searchParams)
        : yield self.environment.api.fetchPermitApplications(searchParams);

      if (response.ok) {
        const permitApplications = response.data.data;

        // Filter based on assignedUserId if set in the store
        const filteredApplications = self.assignedUserIdFilter
          ? permitApplications.filter((app) => app.assignedUsers?.some((user) => user.id === self.assignedUserIdFilter))
          : permitApplications;

        self.mergeUpdateAll(permitApplications, 'permitApplicationMap');
        (self?.rootStore?.programStore?.currentProgram ?? self).setTablePermitApplications(filteredApplications);

        self.currentPage = opts?.page ?? self.currentPage;
        self.totalPages = response.data.meta.totalPages;
        self.totalCount = response.data.meta.totalCount;
        self.countPerPage = opts?.countPerPage ?? self.countPerPage;
      }

      return response.ok;
    }),

    fetchPermitApplication: flow(function* (id: string, review?: boolean) {
      // If the user is review staff, we still need to hit the show endpoint to update viewedAt
      const { ok, data: response } = yield self.environment.api.fetchPermitApplication(id, review);
      if (ok && response.data) {
        const permitApplication = response.data;

        permitApplication.isFullyLoaded = true;

        self.mergeUpdate(permitApplication, 'permitApplicationMap');
        return permitApplication;
      }
    }),

    setPermitApplicationFilters(queryParams: URLSearchParams) {
      const statusFilter = queryParams.get('status')?.split(',') as TFilterableStatus[];
      const templateVersionIdFilter = queryParams.get('templateVersionId');
      const requirementTemplateIdFilter = queryParams.get('requirementTemplateId');
      //show all the applications
      self.setStatusFilter(statusFilter);
      self.requirementTemplateIdFilter = requirementTemplateIdFilter;
      self.templateVersionIdFilter = templateVersionIdFilter;
    },

    processWebsocketChange: flow(function* (payload: IUserPushPayload) {
      //based on the eventType do stuff
      let payloadData;
      switch (payload.eventType as EPermitApplicationSocketEventTypes) {
        case EPermitApplicationSocketEventTypes.updateCompliance:
          payloadData = payload.data as IEnergySavingsApplicationComplianceUpdate;
          const event = new CustomEvent(ECustomEvents.handlePermitApplicationUpdate, { detail: payloadData });

          self.permitApplicationMap
            .get(payloadData?.id)
            ?.setFormattedComplianceData(payloadData?.formattedComplianceData);
          document.dispatchEvent(event);
          break;
        case EPermitApplicationSocketEventTypes.updateSupportingDocuments:
          payloadData = payload.data as IPermitApplicationSupportingDocumentsUpdate;

          self.permitApplicationMap.get(payloadData?.id)?.handleSocketSupportingDocsUpdate(payloadData);
          break;
        case EPermitApplicationSocketEventTypes.updatePermitBlockStatus:
          payloadData = payload.data as IPermitBlockStatus;
          self.permitApplicationMap.get(payloadData?.permitApplicationId)?.updatePermitBlockStatus(payloadData);
        default:
          import.meta.env.DEV && console.log(`Unknown event type ${payload.eventType}`);
      }
    }),
  }));

export interface IEnergySavingsApplicationStore extends Instance<typeof PermitApplicationStoreModel> {}
