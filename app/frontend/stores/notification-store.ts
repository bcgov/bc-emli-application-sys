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
    totalCount: types.maybeNull(types.number),
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
          // NOTE: This notification type is currently dormant (not sent by backend as of commit e8b3849)
          // but user preferences and API still support it. See templatePublished for active equivalent.
          // Infrastructure preserved for potential future reactivation.
          const data = objectData as ITemplateVersionNotificationObjectData;
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
            links.push({
              text: t('permitApplication.reviewUpdatedEditLink'),
              href: `/digital-building-permits/${data.templateVersionId}/edit?compare=true`,
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
        case ENotificationActionType.applicationIneligible:
        case ENotificationActionType.applicationAssignment:
        case ENotificationActionType.participantIncompleteDraftNotification: {
          const data = objectData as IPermitNotificationObjectData;
          return [
            {
              text: t('ui.view'),
              href: getApplicationLink(data.permitApplicationId, true),
            },
          ];
        }

        case ENotificationActionType.accountUpdate:
          return [
            {
              text: t('ui.contactSupport'),
              href: '/get-support',
            },
          ];

        case ENotificationActionType.newSubmissionReceived: {
          const data = objectData as IPermitNotificationObjectData;
          return [
            {
              text: t('ui.review'),
              href: `/applications/${data.permitApplicationId}?review=true`,
            },
          ];
        }

        case ENotificationActionType.templatePublished: {
          const data = objectData as ITemplateVersionNotificationObjectData;
          return [
            {
              text: t('ui.viewTemplate'),
              href: `/blank-template/${data.templateVersionId}`,
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
            meta: { unreadCount, totalPages, totalCount = 0 },
          },
        } = response;

        self.unreadNotificationsCount = unreadCount;
        opts.reset ? self.setNotifications(data) : self.concatToNotifications(data);
        self.totalPages = totalPages;
        self.totalCount = totalCount;
        self.page = self.nextPage;
        self.isLoaded = true;
      } else {
        console.error('[Error] fetchNotifications: Invalid response received.', { response });
      }
    }),

    markAllAsRead: flow(function* () {
      try {
        const apiCallPromise = self.environment.api.resetLastReadNotifications();

        if (!apiCallPromise || typeof apiCallPromise.then !== 'function') {
          console.error(
            '[Error] markAllAsRead: api.resetLastReadNotifications() did not return a Promise',
            apiCallPromise,
          );
          return;
        }

        const response = yield* toGenerator(apiCallPromise);
        if (response.ok) {
          self.unreadNotificationsCount = 0;
        } else {
          console.error('[Error] markAllAsRead: API call failed', response);
        }
      } catch (e) {
        console.error('[Error] markAllAsRead: Unexpected error', e);
      }
    }),

    deleteNotification: flow(function* (notificationId: string) {
      // Optimistically remove from frontend first for immediate feedback
      const notificationIndex = self.notifications.findIndex((n) => n.id === notificationId);
      let removedNotification = null;
      let wasUnread = false;

      if (notificationIndex >= 0) {
        removedNotification = self.notifications[notificationIndex];
        wasUnread = notificationIndex < self.unreadNotificationsCount;

        self.notifications.splice(notificationIndex, 1);

        if (wasUnread) {
          self.unreadNotificationsCount = Math.max(0, self.unreadNotificationsCount - 1);
        }
      }

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

    clearAllNotifications: flow(function* () {
      try {
        const response = yield* toGenerator(self.environment.api.clearAllNotifications());

        if (response.ok) {
          self.notifications.clear();
          self.unreadNotificationsCount = 0;
          self.totalCount = 0;
        } else {
          console.error('[Error] clearAllNotifications: API call failed', response);
        }
      } catch (error) {
        console.error('[Error] clearAllNotifications: Unexpected error', error);
      }
    }),
  }))
  .actions((self) => ({
    initialFetch: flow(function* () {
      yield* toGenerator(self.fetchNotifications());
    }),
    processWebsocketChange: (payload: IUserPushPayload) => {
      self.notifications.unshift(self.convertNotificationToUseDate(payload.data));
      if (self.popoverOpen) {
        // If popover is open, increment unread count so new notification appears as unread
        self.unreadNotificationsCount += 1;
      } else {
        self.unreadNotificationsCount = payload.meta.unreadCount;
      }
      self.totalPages = payload.meta.totalPages;
    },
  }));

const criticalNotificationTypes = [ENotificationActionType.applicationRevisionsRequest];

export interface INotificationStore extends Instance<typeof NotificationStoreModel> {}
