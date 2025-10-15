import { Instance, types } from 'mobx-state-tree';
import { EnergySavingsApplicationModel } from '../models/energy-savings-application';
import { UserModel } from './user';

export const SupportRequestModel = types.model('SupportRequest', {
  id: types.identifier, // UUID or string identifier
  additional_text: types.maybeNull(types.string),
  createdAt: types.string,
  updatedAt: types.string,

  // Minimal nested associations
  parent_application: types.maybeNull(types.late(() => EnergySavingsApplicationModel)),
  linked_application: types.maybeNull(types.late(() => EnergySavingsApplicationModel)),
  requested_by: types.maybeNull(types.late(() => UserModel)),
});

export interface ISupportRequest extends Instance<typeof SupportRequestModel> {}
