import { Instance, types } from 'mobx-state-tree';
import { EPermitClassificationCode } from '../types/enums';

export const PermitClassificationModel = types.model('PermitClassificationModel', {
  id: types.identifier,
  name: types.string,
  code: types.enumeration(Object.values(EPermitClassificationCode)),
  description: types.maybeNull(types.string),
  enabled: types.boolean,
  // imageUrl: types.string,
});

// Subclass Model for PermitType
export const PermitTypeModel = PermitClassificationModel.named('PermitTypeModel').props({
  type: types.literal('PermitType'),
  // Additional properties specific to PermitType
});
// Subclass Model for UserGroupType
export const UserGroupTypeModel = PermitClassificationModel.named('UserGroupTypeModel').props({
  type: types.literal('UserGroupType'),
  // Additional properties specific to UserGroupType
});
// Subclass Model for AudienceType
export const AudienceTypeModel = PermitClassificationModel.named('AudienceTypeModel').props({
  type: types.literal('AudienceType'),
  // Additional properties specific to AudienceType
});
// Subclass Model for SubmissionType
export const SubmissionTypeModel = PermitClassificationModel.named('SubmissionTypeModel').props({
  type: types.literal('SubmissionType'),
  // Additional properties specific to SubmissionType
});
// Subclass Model for Activity
export const ActivityModel = PermitClassificationModel.named('ActivityModel').props({
  type: types.literal('Activity'),
  // Additional properties specific to Activity
});

// Subclass Model for SubmissionVariant
export const SubmissionVariantModel = PermitClassificationModel.named('SubmissionVariantModel').props({
  type: types.literal('SubmissionVariant'),
  parent_id: types.maybeNull(types.string),
});

export interface IPermitClassification extends Instance<typeof PermitClassificationModel> {}
export interface IPermitType extends Instance<typeof PermitTypeModel> {}
export interface IAudienceType extends Instance<typeof AudienceTypeModel> {}
export interface IUserGroupType extends Instance<typeof UserGroupTypeModel> {}
export interface ISubmissionType extends Instance<typeof SubmissionTypeModel> {}
export interface IActivity extends Instance<typeof ActivityModel> {}
export interface ISubmissionVariant extends Instance<typeof SubmissionVariantModel> {
  parent_id: string | null;
}
