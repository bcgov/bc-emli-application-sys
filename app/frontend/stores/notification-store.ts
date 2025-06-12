import { t } from 'i18next';
import { flow, Instance, toGenerator, types } from 'mobx-state-tree';
import * as R from 'ramda';
import { withEnvironment } from '../lib/with-environment';
import { withRootStore } from '../lib/with-root-store';
import { ECollaborationType, ENotificationActionType } from '../types/enums';
import {
  ILinkData,
  INotification,
  IPermitBlockStatusReadyNotificationObjectData,
  IPermitCollaborationNotificationObjectData,
  IPermitNotificationObjectData,
  IRequirementTemplateNotificationObjectData,
  ITemplateVersionNotificationObjectData,
  IUserPushPayload,
} from '../types/types';

export const NotificationStoreModel = types
  .model('NotificationStoreModel')
  .props({
    notifications: types.array(types.frozen<INotification>()),
    page: types.maybeNull(types.number),
    totalPages: types.maybeNull(types.number),
    isLoaded: types.maybeNull(types.boolean),
    unreadNotificationsCount: types.optional(types.number, 0),
    popoverOpen: types.optional(types.boolean, false),
  })
  .extend(withEnvironment())
  .extend(withRootStore())
  .views((self) => ({
    getSemanticKey(notification: INotification) {
      return criticalNotificationTypes.includes(notification.actionType) ? 'warning' : 'info';
    },
    get anyUnread() {
      return self.unreadNotificationsCount > 0;
    },
    get nextPage() {
      return self.page ? self.page + 1 : 1;
    },
    get hasMorePages() {
      return self.totalPages > self.page;
    },
    get criticalNotifications() {
      return self.notifications
        ?.slice(0, self.unreadNotificationsCount)
        .filter((n) => criticalNotificationTypes.includes(n.actionType));
    },
    generateSpecificLinkData(notification: INotification): ILinkData[] {
      const currentUser = self.rootStore.userStore.currentUser;
      const objectData = notification.objectData;
      const draftFilterUriComponent = encodeURIComponent(self.rootStore.permitApplicationStore.draftStatuses.join(','));

      // Helper function for application links
      const getApplicationLink = (permitApplicationId: string, isEdit = true) =>
        `/applications/${permitApplicationId}${isEdit ? '/edit' : ''}`;

      // Helper function for flash message URLs
      const getFlashUrl = (templateId: string, title: string, message: string) =>
        `/applications?requirementTemplateId=${templateId}&status=${draftFilterUriComponent}&flash=${encodeURIComponent(
          JSON.stringify({ type: 'success', title, message }),
        )}`;

      switch (notification.actionType) {
        case ENotificationActionType.newTemplateVersionPublish: {
          const data = objectData as IRequirementTemplateNotificationObjectData;
          const links = [
            {
              text: t('permitApplication.reviewOutdatedSubmissionLink'),
              href: getFlashUrl(
                data.requirementTemplateId,
                t('permitApplication.reviewOutdatedTitle'),
                t('permitApplication.reviewOutdatedMessage'),
              ),
            },
          ];

          if (currentUser.isManager) {
            const templateData = objectData as ITemplateVersionNotificationObjectData;
            links.push({
              text: t('permitApplication.reviewUpdatedEditLink'),
              href: `/digital-building-permits/${templateData.templateVersionId}/edit?compare=true`,
            });
          }
          return links;
        }

        case ENotificationActionType.customizationUpdate: {
          const data = objectData as IRequirementTemplateNotificationObjectData;
          return [
            {
              text: t('permitApplication.reviewCustomizedSubmissionLink'),
              href: getFlashUrl(
                data.requirementTemplateId,
                t('permitApplication.reviewCustomizedTitle'),
                t('permitApplication.reviewCustomizedMessage'),
              ),
            },
          ];
        }

        case ENotificationActionType.submissionCollaborationAssignment:
        case ENotificationActionType.reviewCollaborationAssignment: {
          const data = objectData as IPermitCollaborationNotificationObjectData;
          const isEdit = notification.actionType === ENotificationActionType.submissionCollaborationAssignment;
          return [
            {
              text: t('ui.show'),
              href: getApplicationLink(data.permitApplicationId, isEdit),
            },
          ];
        }

        case ENotificationActionType.submissionCollaborationUnassignment:
        case ENotificationActionType.reviewCollaborationUnassignment:
          return []; // No links for unassignment notifications

        case ENotificationActionType.permitBlockStatusReady: {
          const data = objectData as IPermitBlockStatusReadyNotificationObjectData;
          const isEdit = data.collaborationType !== ECollaborationType.review;
          return [
            {
              text: t('ui.show'),
              href: getApplicationLink(data.permitApplicationId, isEdit),
            },
          ];
        }

        case ENotificationActionType.publishedTemplateMissingRequirementsMapping:
        case ENotificationActionType.scheduledTemplateMissingRequirementsMapping: {
          const data = objectData as ITemplateVersionNotificationObjectData;
          return [
            {
              text: 'View integration mapping',
              href: `/api-settings/api-mappings/digital-building-permits/${data.templateVersionId}/edit`,
            },
          ];
        }

        case ENotificationActionType.applicationSubmission:
        case ENotificationActionType.applicationRevisionsRequest:
        case ENotificationActionType.applicationView:
        case ENotificationActionType.applicationIneligible: {
          const data = objectData as IPermitNotificationObjectData;
          return [
            {
              text: t('ui.show'),
              href: getApplicationLink(data.permitApplicationId, true),
            },
          ];
        }

        default:
          console.warn(`Unhandled notification type: ${notification.actionType}`);
          return [];
      }
    },
  }))
  .actions((self) => ({
    convertNotificationToUseDate(item): INotification {
      return { ...item, at: item.at ? new Date(item.at * 1000) : new Date() };
    },
    setPopoverOpen(isOpen) {
      self.popoverOpen = isOpen;
    },
  }))
  .actions((self) => ({
    setNotifications(notifications) {
      self.notifications = notifications.map((m) => self.convertNotificationToUseDate(m));
    },
    concatToNotifications(notifications) {
      const newNotifications = R.concat(
        self.notifications,
        notifications.map((m) => self.convertNotificationToUseDate(m)),
      );
      self.notifications.replace(newNotifications);
    },
  }))
  .actions((self) => ({
    fetchNotifications: flow(function* (opts = {}) {
      if (opts.reset) self.page = self.totalPages = undefined;
      self.isLoaded = false;
      const response = yield* toGenerator(self.environment.api.fetchNotifications(self.nextPage));

      if (response && response.ok && response.data) {
        const {
          data: {
            data,
            meta: { unreadCount, totalPages },
          },
        } = response;

        self.unreadNotificationsCount = unreadCount;
        opts.reset ? self.setNotifications(data) : self.concatToNotifications(data);
        self.totalPages = totalPages;
        self.page = self.nextPage;
        self.isLoaded = true;
      } else {
        console.error('[Error] fetchNotifications: Invalid response received.', { response });
      }
    }),

    markAllAsRead: flow(function* () {
      const { ok } = yield* toGenerator(self.environment.api.resetLastReadNotifications());
      if (ok) {
        self.unreadNotificationsCount = 0;
      }
    }),

    deleteNotification: flow(function* (notificationId: string) {
      // Optimistically remove from frontend first for immediate feedback
      const notificationIndex = self.notifications.findIndex((n) => n.id === notificationId);
      let removedNotification = null;
      let wasUnread = false; // Track if this was an unread notification

      if (notificationIndex >= 0) {
        removedNotification = self.notifications[notificationIndex];
        // Check if this notification was unread BEFORE modifying the array
        wasUnread = notificationIndex < self.unreadNotificationsCount;

        self.notifications.splice(notificationIndex, 1);

        // Update unread count if this was an unread notification
        if (wasUnread) {
          self.unreadNotificationsCount = Math.max(0, self.unreadNotificationsCount - 1);
        }
      }

      // Make API call to delete from backend
      try {
        const response = yield* toGenerator(self.environment.api.deleteNotification(notificationId));

        if (!response.ok) {
          throw new Error('API call failed');
        }
      } catch (error) {
        // If API call fails, restore the notification
        console.error('[Error] deleteNotification: Failed to delete from backend', {
          notificationId,
          error,
        });

        if (removedNotification && notificationIndex >= 0) {
          self.notifications.splice(notificationIndex, 0, removedNotification);
          if (wasUnread) {
            self.unreadNotificationsCount += 1;
          }
        }
      }
    }),
  }))
  .actions((self) => ({
    initialFetch: flow(function* () {
      yield* toGenerator(self.fetchNotifications());
    }),
    processWebsocketChange: flow(function* (payload: IUserPushPayload) {
      self.notifications.unshift(self.convertNotificationToUseDate(payload.data));
      self.unreadNotificationsCount = self.popoverOpen ? 0 : payload.meta.unreadCount;
      self.totalPages = payload.meta.totalPages;
      yield;
    }),
  }));

const criticalNotificationTypes = [ENotificationActionType.applicationRevisionsRequest];

export interface INotificationStore extends Instance<typeof NotificationStoreModel> {}
