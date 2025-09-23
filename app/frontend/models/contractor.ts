import { Instance, applySnapshot, flow, types } from 'mobx-state-tree';
import { withEnvironment } from '../lib/with-environment';
import { withRootStore } from '../lib/with-root-store';
import { IUser, UserModel } from './user';

export const ContractorModel = types
  .model('ContractorModel')
  .props({
    id: types.identifier,
    businessName: types.maybeNull(types.string),
    website: types.maybeNull(types.string),
    phoneNumber: types.maybeNull(types.string),
    onboarded: types.optional(types.boolean, false),
    createdAt: types.maybeNull(types.Date),
    updatedAt: types.maybeNull(types.Date),
    contact: types.maybeNull(types.reference(UserModel)),
    employees: types.optional(types.array(types.reference(UserModel)), []),
  })
  .extend(withRootStore())
  .extend(withEnvironment())
  .views((self) => ({
    get contactName() {
      return self.contact?.name || '';
    },
    get employeeCount() {
      return self.employees.length;
    },
  }))
  .actions((self) => ({
    update: flow(function* (formData) {
      const response = yield self.environment.api.updateContractor(self.id, formData);
      if (response.ok) {
        applySnapshot(self, response.data.data);
      }
      return response.ok;
    }),
    destroy: flow(function* () {
      const response = yield self.environment.api.destroyContractor(self.id);
      if (response.ok) {
        self.rootStore.contractorStore.removeContractor(self);
      }
      return response.ok;
    }),
  }));

export interface IContractor extends Instance<typeof ContractorModel> {}
