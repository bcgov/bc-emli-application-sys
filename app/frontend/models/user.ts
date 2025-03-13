import { Instance, applySnapshot, flow, types } from 'mobx-state-tree';
import { withEnvironment } from '../lib/with-environment';
import { withRootStore } from '../lib/with-root-store';
import { EOmniauthProvider, EUserRoles } from '../types/enums';
import { ILicenseAgreement } from '../types/types';
import { convertToDate } from '../utils/utility-functions';
import { IJurisdiction, JurisdictionModel } from './jurisdiction';
import { IAddress, AddressModel } from './address';

export const UserModel = types
  .model('UserModel')
  .props({
    id: types.identifier,
    email: types.maybeNull(types.string),
    unconfirmedEmail: types.maybeNull(types.string),
    role: types.enumeration(Object.values(EUserRoles)),
    omniauthEmail: types.maybeNull(types.string),
    omniauthUsername: types.maybeNull(types.string),
    omniauthProvider: types.maybeNull(types.enumeration(Object.values(EOmniauthProvider))),
    firstName: types.maybeNull(types.string),
    lastName: types.maybeNull(types.string),
    certified: types.maybeNull(types.boolean),
    organization: types.maybeNull(types.string),
    jurisdictions: types.array(types.reference(types.late(() => JurisdictionModel))),
    createdAt: types.maybeNull(types.Date),
    confirmationSentAt: types.maybeNull(types.Date),
    confirmedAt: types.maybeNull(types.Date),
    discardedAt: types.maybeNull(types.Date),
    lastSignInAt: types.maybeNull(types.Date),
    eulaAccepted: types.maybeNull(types.boolean),
    invitedByEmail: types.maybeNull(types.string),
    reviewed: types.boolean,
    preference: types.frozen<IPreference>(),
    invitedToJurisdiction: types.maybeNull(types.frozen<IJurisdiction>()),
    licenseAgreements: types.maybeNull(types.frozen<ILicenseAgreement[]>()),
    physicalAddress: types.maybeNull(AddressModel),
    mailingAddress: types.maybeNull(AddressModel),
  })
  .extend(withRootStore())
  .extend(withEnvironment())
  .views((self) => ({
    //new roles
    get isSystemAdmin() {
      return self.role == EUserRoles.systemAdmin;
    },
    get isPSR() {
      return self.role == EUserRoles.participantSupportRep;
    },
    get isContractor() {
      return self.role == EUserRoles.contractor;
    },
    get isAdminManager() {
      return self.role == EUserRoles.adminManager;
    },
    get isAdmin() {
      return self.role == EUserRoles.admin;
    },
    get isParticipant() {
      return self.role == EUserRoles.participant;
    },
    //TODO: old roles, to be phased out
    get isSuperAdmin() {
      return self.role == EUserRoles.systemAdmin;
    },
    get isRegionalReviewManager() {
      return self.role == EUserRoles.adminManager;
    },
    get isReviewManager() {
      return self.role == EUserRoles.adminManager;
    },
    get isManager() {
      return self.role == EUserRoles.adminManager;
    },
    get isReviewer() {
      return self.role == EUserRoles.admin;
    },
    get isReviewStaff() {
      return (
        self.role == EUserRoles.admin || self.role == EUserRoles.adminManager
        //self.role == EUserRoles.regionalReviewManager
      );
    },
    get isSubmitter() {
      return self.role == EUserRoles.participant;
    },
    get isDiscarded() {
      return self.discardedAt !== null;
    },
    get isUnconfirmed() {
      return self.confirmedAt == null;
    },
    get isReviewed() {
      return self.reviewed || false;
    },
    get isIDIR() {
      return self.omniauthProvider === 'azureidir';
    },
    get isBusBCEID() {
      return self.omniauthProvider === 'bceidbusiness';
    },
    get isBasicBCEID() {
      return self.omniauthProvider === 'bceidbasic';
    },
    get isBCSC() {
      return self.omniauthProvider === 'bcsc';
    },
    get name() {
      return self.firstName && self.lastName && `${self.firstName} ${self.lastName}`;
    },
    get jurisdiction() {
      return (
        self.jurisdictions.find((j) => j.id == self.rootStore.uiStore.currentlySelectedJurisdictionId) ||
        self.jurisdictions[0]
      );
    },
    get isSameAddress() {
      if (!self.mailingAddress || !self.physicalAddress) {
        return false; // If either is null, they can't be the same
      }

      const isSame =
        self.mailingAddress.streetAddress === self.physicalAddress.streetAddress &&
        self.mailingAddress.locality === self.physicalAddress.locality &&
        self.mailingAddress.region === self.physicalAddress.region &&
        self.mailingAddress.postalCode === self.physicalAddress.postalCode &&
        self.mailingAddress.country === self.physicalAddress.country;

      console.log('isSameAddress result:', isSame);
      return isSame;
    },
  }))
  .actions((self) => ({
    setAddresses(physical: IAddress | null, mailing: IAddress | null) {
      self.physicalAddress = physical ? AddressModel.create(physical) : null;
      self.mailingAddress = mailing ? AddressModel.create(mailing) : null;
    },
    setLicenseAgreements(licenseAgreements: ILicenseAgreement[]) {
      self.licenseAgreements = licenseAgreements?.map((licenseAgreement) => ({
        ...licenseAgreement,
        acceptedAt: convertToDate(licenseAgreement.acceptedAt),
      }));
    },
  }))
  .actions((self) => ({
    destroy: flow(function* () {
      const response = yield self.environment.api.destroyUser(self.id);
      if (response.ok) applySnapshot(self, response.data.data);
      return response.ok;
    }),
    restore: flow(function* () {
      const response = yield self.environment.api.restoreUser(self.id);
      if (response.ok) applySnapshot(self, response.data.data);
      return response.ok;
    }),
    changeRole: flow(function* () {
      let newRole = null;
      if (self.role === EUserRoles.adminManager) {
        newRole = EUserRoles.admin;
      } else if (self.role === EUserRoles.admin) {
        newRole = EUserRoles.adminManager;
      } else {
        return;
      }

      const response = yield self.environment.api.updateUser(self.id, { role: newRole });
      if (response.ok) applySnapshot(self, response.data.data);
      return response.ok;
    }),
    acceptEULA: flow(function* () {
      const response = yield self.environment.api.acceptEULA(self.id);
      if (response.ok) {
        self.rootStore.userStore.mergeUpdate(response.data.data, 'usersMap');
      }
      return response.ok;
    }),
    fetchAcceptedEulas: flow(function* () {
      const response = yield self.environment.api.fetchCurrentUserAcceptedEulas();

      if (response.ok) {
        const licenseAgreements = response.data.data?.licenseAgreements;

        Array.isArray(licenseAgreements) && self.setLicenseAgreements(licenseAgreements);
      }

      return response.ok;
    }),
    acceptInvitation: flow(function* (invitationToken: string) {
      const response = yield self.environment.api.acceptInvitation(self.id, { invitationToken });
      if (response.ok) {
        self.rootStore.userStore.mergeUpdate(response.data.data, 'usersMap');
      }
      return response.ok;
    }),
    resendConfirmation: flow(function* () {
      const response = yield self.environment.api.resendConfirmation(self.id);
      if (response.ok) {
        self.rootStore.userStore.mergeUpdate(response.data.data, 'usersMap');
      }
      return response.ok;
    }),
    reinvite: flow(function* () {
      const response = yield self.environment.api.reinviteUser(self.id);
      if (response.ok) {
        self.rootStore.userStore.mergeUpdate(response.data.data, 'usersMap');
      }
      return response.ok;
    }),
  }));

export interface IUser extends Instance<typeof UserModel> {}

export interface IPreference {
  enableInAppNewTemplateVersionPublishNotification: boolean;
  enableEmailNewTemplateVersionPublishNotification: boolean;
  enableInAppCustomizationUpdateNotification: boolean;

  enableInAppApplicationSubmissionNotification: boolean;
  enableEmailApplicationSubmissionNotification: boolean;
  enableInAppApplicationViewNotification: boolean;
  enableEmailApplicationViewNotification: boolean;
  enableInAppApplicationRevisionsRequestNotification: boolean;
  enableEmailApplicationRevisionsRequestNotification: boolean;

  enableInAppCollaborationNotification: boolean;
  enableEmailCollaborationNotification: boolean;

  enableInAppIntegrationMappingNotification: boolean;
  enableEmailIntegrationMappingNotification: boolean;
}
