import { Instance, flow, toGenerator, types } from 'mobx-state-tree';
import { withEnvironment } from '../lib/with-environment';
import { withMerge } from '../lib/with-merge';
import { withRootStore } from '../lib/with-root-store';
import {
  ActivityModel,
  IActivity,
  PermitTypeModel,
  IPermitType,
  AudienceTypeModel,
  IAudienceType,
  UserGroupTypeModel,
  IUserGroupType,
  SubmissionTypeModel,
  ISubmissionType,
  SubmissionVariantModel,
  ISubmissionVariant,
} from '../models/permit-classification';
import { EPermitClassificationCode, EPermitClassificationType } from '../types/enums';
import { IOption } from '../types/types';

interface FetchOptionI {
  userGroupType: string;
  AudienceType: string;
  SubmissionType: string[] | string;
}

export const PermitClassificationStoreModel = types
  .model('PermitClassificationStore', {
    // old classifications, TODO: remove at some point
    permitTypeMap: types.map(PermitTypeModel),
    activityMap: types.map(ActivityModel),
    isPermitTypeLoading: types.optional(types.boolean, false),
    isActivityLoading: types.optional(types.boolean, false),
    // new classifications
    audienceTypeMap: types.map(AudienceTypeModel),
    userGroupTypeMap: types.map(UserGroupTypeModel),
    submissionTypeMap: types.map(SubmissionTypeModel),
    submissionVariantMap: types.map(SubmissionVariantModel),
    isAudienceTypeLoading: types.optional(types.boolean, false),
    isUserGroupTypeLoading: types.optional(types.boolean, false),
    isSubmissionTypeLoading: types.optional(types.boolean, false),
    isSubmissionVariantLoading: types.optional(types.boolean, false),
    isLoaded: types.optional(types.boolean, false),
  })
  .extend(withEnvironment())
  .extend(withRootStore())
  .extend(withMerge())
  .views((self) => ({
    // View to get a PermitType by id
    getPermitTypeById(id: string) {
      return self.permitTypeMap.get(id);
    },
    // View to get all PermitTypes as an array
    get permitTypes() {
      return Array.from(self.permitTypeMap.values());
    },
    // View to get an Activity by id
    getActivityById(id: string) {
      return self.activityMap.get(id);
    },
    // View to get all Activities as an array
    get activities() {
      return Array.from(self.activityMap.values());
    },
    // View to get an Audience type by id
    getAudienceTypeById(id: string) {
      return self.audienceTypeMap.get(id);
    },
    // View to get a User group type id by code
    getAudienceTypeIdByCode(code: string) {
      const match = Array.from(self.audienceTypeMap.values()).find((item) => item.code === code);
      return match?.id;
    },
    // view to get all Audience types
    get audienceTypes() {
      return Array.from(self.audienceTypeMap.values());
    },
    get audienceTypeOptions(): Array<IOption<IAudienceType>> {
      return Array.from(self.audienceTypeMap.values()).map((item) => ({
        label: item.name,
        value: item,
      }));
    },
    // View to get a User group type by id
    getUserGroupTypeById(id: string) {
      return self.userGroupTypeMap.get(id);
    },
    // View to get an Audience type by id
    getUserGroupTypeByCode(code: number) {
      return self.userGroupTypeMap.get(code.toString());
    },
    // View to get a User group type id by code
    getUserTypeIdByCode(code: string) {
      const match = Array.from(self.userGroupTypeMap.values()).find((item) => item.code === code);
      return match?.id;
    },
    // view to get all User group types
    get userGroupTypes() {
      return Array.from(self.userGroupTypeMap.values());
    },
    get userGroupTypeOptions(): Array<IOption<IUserGroupType>> {
      return Array.from(self.userGroupTypeMap.values()).map((item) => ({
        label: item.name,
        value: item,
      }));
    },
    // View to get a submission type by id
    getSubmissionTypeById(id: string) {
      return self.submissionTypeMap.get(id);
    },
    // View to get a User group type id by code
    getSubmissionTypeIdByCode(code: string) {
      const match = Array.from(self.submissionTypeMap.values()).find((item) => item.code === code);
      return match?.id;
    },
    // view to get all submission types
    get submissionTypes() {
      return Array.from(self.submissionTypeMap.values());
    },
    get submissionTypeOptions(): Array<IOption<string>> {
      return Array.from(self.submissionTypeMap.values()).map((item) => ({
        label: item.name,
        value: item.id,
      }));
    },
    // view to get all submission types ids
    getAllSubmissionTypeIds() {
      return Array.from(self.submissionTypeMap.values()).map((item) => item.id);
    },
    // view to get all submission types
    getSubmissionTypeIdsExceptOnboarding() {
      return Array.from(self.submissionTypeMap.values())
        .filter((item) => item.code !== EPermitClassificationCode.onboarding)
        .map((item) => item.id);
    },
    // submission variant types
    getSubmissionVariantById(id: string) {
      return self.submissionVariantMap.get(id);
    },
    get submissionVariants() {
      return Array.from(self.submissionVariantMap.values());
    },
    getSubmissionVariantsForType(submissionTypeId: string) {
      if (!submissionTypeId) return [];

      // Now filter using the actual GUID-based parent_id
      return Array.from(self.submissionVariantMap.values()).filter((v) => v.parentId === submissionTypeId);
    },
  }))
  .actions((self) => ({
    // Action to add a new PermitType
    addPermitType(permitType: Instance<typeof PermitTypeModel>) {
      self.permitTypeMap.put(permitType);
    },
    // Action to remove a PermitType
    removePermitType(id: string) {
      self.permitTypeMap.delete(id);
    },
    // Action to add a new Activity
    addActivity(activity: Instance<typeof ActivityModel>) {
      self.activityMap.put(activity);
    },
    // Action to remove an Activity
    removeActivity(id: string) {
      self.activityMap.delete(id);
    },
    fetchPermitClassifications: flow(function* () {
      const response: any = yield self.environment.api.fetchPermitClassifications();
      if (response.ok) {
        const permitTypeData = response.data.data.filter((pc) => pc.type == EPermitClassificationType.PermitType);
        const activityData = response.data.data.filter((pc) => pc.type == EPermitClassificationType.Activity);
        const submissionData = response.data.data.filter((pc) => pc.type == EPermitClassificationType.SubmissionType);
        const userGroupData = response.data.data.filter((pc) => pc.type == EPermitClassificationType.UserGroupType);
        const audienceData = response.data.data.filter((pc) => pc.type == EPermitClassificationType.AudienceType);
        const submissionVariantData = response.data.data.filter(
          (pc) => pc.type == EPermitClassificationType.SubmissionVariant,
        );
        if (permitTypeData.length) self.mergeUpdateAll(permitTypeData, 'permitTypeMap');
        if (activityData.length) self.mergeUpdateAll(activityData, 'activityMap');
        if (submissionData.length) self.mergeUpdateAll(submissionData, 'submissionTypeMap');
        if (userGroupData.length) self.mergeUpdateAll(userGroupData, 'userGroupTypeMap');
        if (audienceData.length) self.mergeUpdateAll(audienceData, 'audienceTypeMap');
        if (submissionVariantData.length) self.mergeUpdateAll(submissionVariantData, 'submissionVariantMap');
      }
      self.isLoaded = true;
      return response.ok;
    }),
    submissionOptionTypes(): Array<IOption<FetchOptionI>> {
      const participantId = self.getUserTypeIdByCode(EPermitClassificationCode.participant);
      const contractorId = self.getUserTypeIdByCode(EPermitClassificationCode.contractor);
      const externalId = self.getAudienceTypeIdByCode(EPermitClassificationCode.external);
      const internalId = self.getAudienceTypeIdByCode(EPermitClassificationCode.internal);
      const onboardingId = self.getSubmissionTypeIdByCode(EPermitClassificationCode.onboarding);

      if (!participantId || !contractorId || !externalId || !internalId || !onboardingId) {
        return [];
      }

      return [
        {
          label: 'participantSubmission',
          value: {
            userGroupType: participantId,
            AudienceType: externalId,
            SubmissionType: self.getAllSubmissionTypeIds(),
          },
        },
        {
          label: 'contractorSubmission',
          value: {
            userGroupType: contractorId,
            AudienceType: internalId,
            SubmissionType: self.getSubmissionTypeIdsExceptOnboarding(),
          },
        },
        {
          label: 'contractorOnboarding',
          value: {
            userGroupType: contractorId,
            AudienceType: internalId,
            SubmissionType: onboardingId,
          },
        },
      ];
    },
  }))
  .actions((self) => ({
    fetchPermitTypeOptions: flow(function* (publishedOnly = false) {
      self.isPermitTypeLoading = true;
      const response = yield* toGenerator(
        self.environment.api.fetchPermitClassificationOptions(EPermitClassificationType.PermitType, publishedOnly),
      );
      self.isPermitTypeLoading = false;
      return (response?.data?.data ?? []) as IOption<IPermitType>[];
    }),
    fetchActivityOptions: flow(function* (publishedOnly = false) {
      self.isActivityLoading = true;
      const response = yield* toGenerator(
        self.environment.api.fetchPermitClassificationOptions(EPermitClassificationType.Activity, publishedOnly),
      );
      self.isActivityLoading = false;
      return (response?.data?.data ?? []) as IOption<IActivity>[];
    }),
    // new classification types
    fetchAudienceTypeOptions: flow(function* (publishedOnly = false) {
      self.isAudienceTypeLoading = true;
      const response = yield* toGenerator(
        self.environment.api.fetchPermitClassificationOptions(EPermitClassificationType.AudienceType, publishedOnly),
      );
      self.isAudienceTypeLoading = false;
      return (response?.data?.data ?? []) as IOption<IAudienceType>[];
    }),
    fetchSubmissionTypeOptions: flow(function* (publishedOnly = false) {
      self.isSubmissionTypeLoading = true;
      const response = yield* toGenerator(
        self.environment.api.fetchPermitClassificationOptions(EPermitClassificationType.SubmissionType, publishedOnly),
      );
      self.isSubmissionTypeLoading = false;
      return (response?.data?.data ?? []) as IOption<ISubmissionType>[];
    }),
    fetchUserGroupTypeOptions: flow(function* (publishedOnly = false) {
      self.isUserGroupTypeLoading = true;
      const response = yield* toGenerator(
        self.environment.api.fetchPermitClassificationOptions(EPermitClassificationType.UserGroupType, publishedOnly),
      );
      self.isUserGroupTypeLoading = false;
      return (response?.data?.data ?? []) as IOption<IUserGroupType>[];
    }),
    fetchSubmissionVariantOptions: flow(function* (publishedOnly = false) {
      self.isSubmissionVariantLoading = true;
      const response = yield* toGenerator(
        self.environment.api.fetchPermitClassificationOptions(
          EPermitClassificationType.SubmissionVariant,
          publishedOnly,
        ),
      );
      self.isSubmissionVariantLoading = false;
      return ((response?.data?.data ?? []) as unknown as IOption<ISubmissionVariant>[]).filter(
        (pc) => (pc.value as any).type === EPermitClassificationType.SubmissionVariant,
      );
    }),
  }));

export interface IPermitClassificationStore extends Instance<typeof PermitClassificationStoreModel> {}
