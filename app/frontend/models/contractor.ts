import { Instance, applySnapshot, flow, types } from 'mobx-state-tree';
import { withEnvironment } from '../lib/with-environment';
import { withRootStore } from '../lib/with-root-store';
import { IUser, UserModel } from './user';
import { ContractorOnboardModel } from './contractor-onboard';

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
    contactId: types.maybeNull(types.string),
    employees: types.optional(types.array(types.reference(UserModel)), []),
    onboardings: types.optional(types.array(types.reference(ContractorOnboardModel)), []),
    number: types.maybeNull(types.string),
    suspendedAt: types.maybeNull(types.Date),
    suspendedReason: types.maybeNull(types.string),
    deactivatedAt: types.maybeNull(types.Date),
    deactivatedReason: types.maybeNull(types.string),
  })
  .extend(withRootStore())
  .extend(withEnvironment())
  .views((self) => ({
    get contact() {
      if (!self.contactId) return null;
      return self.rootStore.userStore.getUser(self.contactId) || null;
    },
    get contactName() {
      const contact = self.contactId ? self.rootStore.userStore.getUser(self.contactId) : null;
      return contact?.name || '';
    },
    get employeeCount() {
      return self.employees.length;
    },
    get isSuspended() {
      return self.suspendedAt !== null;
    },
    get isDeactivated() {
      return self.deactivatedAt !== null;
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
    reload: flow(function* () {
      const response = yield self.environment.api.fetchContractor(self.id);
      if (response.ok) {
        const data = response.data.data;
        self.rootStore.contractorStore.mergeUpdate(data, 'contractorsMap');
      }
      return response.ok;
    }),
  }));

export interface IContractor extends Instance<typeof ContractorModel> {}
