import { makePersistable } from 'mobx-persist-store';
import { IStateTreeNode, flow, protect, types, unprotect } from 'mobx-state-tree';
import { createUserChannelConsumer } from '../channels/user_channel';
import { withEnvironment } from '../lib/with-environment';
import { CollaboratorStoreModel, ICollaboratorStore } from './collaborator-store';
import { ContactStoreModel, IContactStore } from './contact-store';
import { EarlyAccessPreviewStoreModel, IEarlyAccessPreviewStoreModel } from './early-access-preview-store';
import {
  EarlyAccessRequirementBlockStoreModel,
  IEarlyAccessRequirementBlockStoreModel,
} from './early-access-requirement-block-store';
import {
  EarlyAccessRequirementTemplateStoreModel,
  IEarlyAccessRequirementTemplateStoreModel,
} from './early-access-requirement-template-store';
import { GeocoderStoreModel, IGeocoderStore } from './geocoder-store';
import { IJurisdictionStore, JurisdictionStoreModel } from './jurisdiction-store';
import { IProgramStore, ProgramStoreModel } from './program-store';
import { INotificationStore, NotificationStoreModel } from './notification-store';
import { IEnergySavingsApplicationStore, PermitApplicationStoreModel } from './energy-savings-application-store';
import { IPermitClassificationStore, PermitClassificationStoreModel } from './permit-classification-store';
import { IRequirementBlockStoreModel, RequirementBlockStoreModel } from './requirement-block-store';
import { IRequirementTemplateStoreModel, RequirementTemplateStoreModel } from './requirement-template-store';
import { ISandboxStore, SandboxStoreModel } from './sandbox-store';
import { ISessionStore, SessionStoreModel } from './session-store';
import { ISiteConfigurationStore, SiteConfigurationStoreModel } from './site-configuration-store';
import { IStepCodeStore, StepCodeStoreModel } from './step-code-store';
import { ITemplateVersionStoreModel, TemplateVersionStoreModel } from './template-version-store';
import { IUIStore, UIStoreModel } from './ui-store';
import { IUserStore, UserStoreModel } from './user-store';
import { IProgramClassificationStore } from './program-user-classification-store';

export const RootStoreModel = types
  .model('RootStoreModel')
  .props({
    uiStore: types.optional(UIStoreModel, {}),
    sessionStore: types.optional(SessionStoreModel, {}),
    userStore: types.optional(UserStoreModel, {}),
    permitApplicationStore: types.optional(PermitApplicationStoreModel, {}),
    permitClassificationStore: types.optional(PermitClassificationStoreModel, {}),
    programStore: types.optional(ProgramStoreModel, {}),
    jurisdictionStore: types.optional(JurisdictionStoreModel, {}),
    requirementBlockStore: types.optional(RequirementBlockStoreModel, {}),
    earlyAccessRequirementBlockStore: types.optional(EarlyAccessRequirementBlockStoreModel, {}),
    requirementTemplateStore: types.optional(RequirementTemplateStoreModel, {}),
    earlyAccessRequirementTemplateStore: types.optional(EarlyAccessRequirementTemplateStoreModel, {}),
    earlyAccessPreviewStore: types.optional(EarlyAccessPreviewStoreModel, {}),
    collaboratorStore: types.optional(CollaboratorStoreModel, {}),
    templateVersionStore: types.optional(TemplateVersionStoreModel, {}),
    geocoderStore: types.optional(GeocoderStoreModel, {}),
    stepCodeStore: types.optional(StepCodeStoreModel, {}),
    siteConfigurationStore: types.optional(SiteConfigurationStoreModel, {}),
    contactStore: types.optional(ContactStoreModel, {}),
    notificationStore: types.optional(NotificationStoreModel, {}),
    sandboxStore: types.optional(SandboxStoreModel, {}),
  })
  .extend(withEnvironment())
  .volatile((self) => ({
    userChannelSubscription: null,
    userChannelConsumer: null,
  }))
  .views((self) => ({}))
  .actions((self) => ({
    loadLocalPersistedData: flow(function* () {
      unprotect(self);
      yield makePersistable(self.sessionStore, {
        name: `${self.userStore.currentUser?.id}-SessionStore`,
        properties: ['afterLoginPath'],
        storage: localStorage,
      });
      yield makePersistable(self.uiStore, {
        name: `${self.userStore.currentUser?.id}-UIStore`,
        properties: ['currentlySelectedJurisdictionId'],
        storage: localStorage,
      });
      if (!self.userStore.currentUser?.isSuperAdmin || self.sandboxStore.temporarilyPersistingSandboxId) {
        yield makePersistable(self.sandboxStore, {
          name: `SandboxStore`,
          properties: ['currentSandboxId'],
          storage: localStorage,
        });
      } else {
        localStorage.removeItem('SandboxStore');
      }
      protect(self);
    }),
    subscribeToUserChannel: flow(function* () {
      if (!self.userChannelSubscription && self.userStore.currentUser) {
        const { consumer, subscription } = yield createUserChannelConsumer(
          self.userStore.currentUser.id,
          self as unknown as IRootStore,
        );
        unprotect(self);
        self.userChannelConsumer = consumer;
        self.userChannelSubscription = subscription;
        protect(self);
      }
    }),
    disconnectUserChannel() {
      // Properly cleanup both subscription and consumer to prevent socket leaks
      self.userChannelSubscription?.unsubscribe();
      self.userChannelConsumer?.disconnect();
      unprotect(self);
      self.userChannelSubscription = null;
      self.userChannelConsumer = null;
      protect(self);
    },
  }))
  .actions((self) => ({
    afterCreate() {
      self.loadLocalPersistedData();
    },
  }));

export interface IRootStore extends IStateTreeNode {
  uiStore: IUIStore;
  sessionStore: ISessionStore;
  permitApplicationStore: IEnergySavingsApplicationStore;
  permitClassificationStore: IPermitClassificationStore;
  programClassificationStore: IProgramClassificationStore;
  jurisdictionStore: IJurisdictionStore;
  programStore: IProgramStore;
  userStore: IUserStore;
  earlyAccessRequirementBlockStore: IEarlyAccessRequirementBlockStoreModel;
  requirementBlockStore: IRequirementBlockStoreModel;
  requirementTemplateStore: IRequirementTemplateStoreModel;
  earlyAccessRequirementTemplateStore: IEarlyAccessRequirementTemplateStoreModel;
  earlyAccessPreviewStore: IEarlyAccessPreviewStoreModel;
  templateVersionStore: ITemplateVersionStoreModel;
  geocoderStore: IGeocoderStore;
  stepCodeStore: IStepCodeStore;
  siteConfigurationStore: ISiteConfigurationStore;
  contactStore: IContactStore;
  notificationStore: INotificationStore;
  collaboratorStore: ICollaboratorStore;
  sandboxStore: ISandboxStore;
  subscribeToUserChannel: () => Promise<void>;
  disconnectUserChannel: () => void;
  loadLocalPersistedData: () => void;
}
