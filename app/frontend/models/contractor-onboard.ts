import { types } from 'mobx-state-tree';
import { ContractorModel } from './contractor';
import { PermitApplicationModel } from './permit-application'; // assuming this exists

export const ContractorOnboardModel = types.model('ContractorOnboardModel', {
  id: types.identifier,
  contractor: types.reference(types.late(() => ContractorModel)),
  onboardApplication: types.reference(PermitApplicationModel),

  createdAt: types.maybeNull(types.Date),
  updatedAt: types.maybeNull(types.Date),
  deactivatedAt: types.maybeNull(types.Date),
  suspendedAt: types.maybeNull(types.Date),
  suspendedReason: types.maybeNull(types.string),
});
