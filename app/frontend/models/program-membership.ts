import { Instance, flow, toGenerator, types } from 'mobx-state-tree';
import { ProgramClassificationModel } from './program-classification';

export const UserProgramMembershipModel = types.model('UserProgramMembershipModel', {
  id: types.identifier,
  programId: types.string,
  deactivatedAt: types.maybeNull(types.string),
  classifications: types.array(ProgramClassificationModel),
});
