import { t } from 'i18next';
import { values } from 'mobx';
import { Instance, flow, toGenerator, types } from 'mobx-state-tree';
import * as R from 'ramda';
import { createSearchModel } from '../lib/create-search-model';
import { withEnvironment } from '../lib/with-environment';
import { withMerge } from '../lib/with-merge';
import { withRootStore } from '../lib/with-root-store';
import { IUser, UserModel } from '../models/user';
import { IInvitationResponse } from '../types/api-responses';
import {
  EUserRoles,
  //EUserSortFields,
  EActiveUserSortFields,
  EPendingUserSortFields,
  EDeactivatedUserSortFields,
} from '../types/enums';
import { IEULA } from '../types/types';
import { convertToDate, toCamelCase } from '../utils/utility-functions';

export const UserStoreModel = types
  .compose(
    types.model('UserStoreModel').props({
      usersMap: types.map(UserModel),
      currentUser: types.maybeNull(types.safeReference(UserModel)),
      invitedUser: types.maybeNull(types.safeReference(UserModel)),
      invitationResponse: types.maybeNull(types.frozen<IInvitationResponse>()),
      eula: types.maybeNull(types.frozen<IEULA>()),
      tableUsers: types.array(types.reference(UserModel)),
      activeUsers: types.array(types.reference(UserModel)),
      isSuperAdminsLoaded: types.optional(types.boolean, false),
      status: types.optional(types.enumeration(['active', 'pending', 'deactivated']), 'active'),
      allUsers: types.optional(types.boolean, false),
    }),
    createSearchModel<EActiveUserSortFields | EPendingUserSortFields | EDeactivatedUserSortFields>('searchUsers'),
  )
  .extend(withEnvironment())
  .extend(withRootStore())
  .extend(withMerge())
  .views((self) => ({
    get users(): IUser[] {
      //@ts-ignore
      return values(self.usersMap) as IUser[];
    },
    get reinvitedEmails(): string[] {
      return self.invitationResponse?.data?.reinvited?.map((user) => user.email) || [];
    },
    get invitedEmails(): string[] {
      return self.invitationResponse?.data?.invited?.map((user) => user.email) || [];
    },
    get takenEmails(): string[] {
      return self.invitationResponse?.data?.emailTaken?.map((user) => user.email) || [];
    },
    getActiveUserSortColumnHeader(field: EActiveUserSortFields) {
      //@ts-ignore
      return t(`user.fields.${toCamelCase(field)}`);
    },
    getPendingUserSortColumnHeader(field: EPendingUserSortFields) {
      //@ts-ignore
      return t(`user.fields.${toCamelCase(field)}`);
    },
    getDeactivatedUserSortColumnHeader(field: EDeactivatedUserSortFields) {
      //@ts-ignore
      return t(`user.fields.${toCamelCase(field)}`);
    },
    getUser(id) {
      return self.usersMap.get(id);
    },
  }))
  .views((self) => ({
    get adminUsers(): IUser[] {
      return self.users.filter((u) => u.role === EUserRoles.systemAdmin);
    },
  }))
  .actions((self) => ({
    __beforeMergeUpdate(user) {
      if (user.jurisdictions) {
        self.rootStore.jurisdictionStore.mergeUpdateAll(user.jurisdictions, 'jurisdictionMap');
        user.jurisdictions = R.pluck('id')(user.jurisdictions);
      }
      return user;
    },
    resetInvitationResponse: () => {
      self.invitationResponse = null;
    },
    setTableUsers: (users) => {
      self.tableUsers = users.map((user) => user.id);
    },
    setActiveUsers: (users) => {
      self.activeUsers = users.map((user) => user.id);
    },
    setUsers(users) {
      R.forEach((u) => self.usersMap.put(u), users);
    },
    removeUser(removedUser) {
      self.usersMap.delete(removedUser.id);
    },
    setCurrentUser(user) {
      self.mergeUpdate(user, 'usersMap');
      self.currentUser = user.id;
    },
    unsetCurrentUser() {
      self.currentUser = null;
    },
    invite: flow(function* (formData) {
      const response = yield self.environment.api.invite(formData);
      self.invitationResponse = response.data;
      return response.ok;
    }),
    fetchInvitedUser: flow(function* (token: string, programId) {
      const { ok, data: response } = yield* toGenerator(self.environment.api.fetchInvitedUser(token, programId));
      if (ok) {
        console.log(response.data);
        self.mergeUpdate(response.data, 'usersMap');
        self.invitedUser = response.data.id;
      }
      return ok;
    }),
    updateProfile: flow(function* (formData) {
      const { ok, data: response } = yield self.environment.api.updateProfile(formData);
      if (ok) {
        self.mergeUpdate(response.data, 'usersMap');
      }
      return ok;
    }),
    fetchEULA: flow(function* () {
      const response = yield self.environment.api.getEULA();
      if (response.ok) {
        const eula = response.data.data;

        if (eula) {
          eula.createdAt = convertToDate(eula.createdAt);
        }

        self.eula = eula;

        return true;
      }
    }),
    getUserById(id: string) {
      return self.usersMap.get(id);
    },
    fetchSuperAdmins: flow(function* () {
      if (self.isSuperAdminsLoaded) return;

      const response = yield self.environment.api.fetchSuperAdmins();

      if (response.ok) {
        self.mergeUpdateAll(response.data.data, 'usersMap');
      }
      self.isSuperAdminsLoaded = true;
      return response.ok;
    }),
    fetchActivePrograms: flow(function* () {
      if (!self.currentUser) return;

      const response = yield self.environment.api.getUsersActivePrograms();
      if (response.ok) {
        self.currentUser.setActivePrograms(response.data.data);
        return response.ok;
      }
    }),
  }))
  .actions((self) => ({
    searchUsers: flow(function* (
      opts: {
        reset?: boolean;
        page?: number;
        countPerPage?: number;
        skipMerge?: boolean;
        filterForAssignment?: boolean;
      } = {},
    ) {
      if (opts.reset) {
        self.resetPages();
      }

      const searchParams = {
        query: self.query,
        sort: self.sort,
        page: opts.page ?? self.currentPage,
        perPage: opts.countPerPage ?? self.countPerPage,
        status: self.status,
        allUsers: self.allUsers,
        filter_for_assignment: opts.filterForAssignment ? 'true' : undefined,
      };

      const response = yield self.rootStore.programStore.currentProgram?.id
        ? self.environment.api.fetchUsersByProgram(self.rootStore.programStore.currentProgram.id, searchParams)
        : self.environment.api.fetchAdminUsers(searchParams);

      if (response.ok) {
        // Skip expensive mergeUpdateAll for search-only results (assignment popup)
        if (!opts.skipMerge) {
          self.mergeUpdateAll(response.data.data, 'usersMap');
        } else {
          // Lightweight update: only add users not already in usersMap to prevent getUser() failures
          response.data.data.forEach((user) => {
            if (!self.usersMap.has(user.id)) {
              self.usersMap.put(user);
            }
          });
        }

        // Backend already handles sorting, so no need for client-side sorting
        self.setTableUsers(response.data.data);
        self.currentPage = opts.page ?? self.currentPage;
        self.totalPages = response.data.meta.totalPages;
        self.totalCount = response.data.meta.totalCount;
        self.countPerPage = opts.countPerPage ?? self.countPerPage;
      }
      return response.ok;
    }),
    getSuperAdminOptions: flow(function* () {
      if (!self.isSuperAdminsLoaded) yield self.fetchSuperAdmins();

      return self.adminUsers.map((u) => ({ label: u.name, value: u.id }));
    }),
  }))
  .actions((self) => ({
    setStatus(status: 'active' | 'pending' | 'deactivated') {
      self.status = status;
      self.searchUsers({ reset: true });
    },
    setAllUsers(allUsers: boolean) {
      self.allUsers = allUsers;
      self.searchUsers({ reset: true });
    },
    searchUsersOptimized: flow(function* () {
      return yield self.searchUsers();
    }),
  }));

export interface IUserStore extends Instance<typeof UserStoreModel> {}
