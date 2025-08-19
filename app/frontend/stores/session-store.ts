import { flow, Instance, types } from 'mobx-state-tree';
import { withEnvironment } from '../lib/with-environment';
import { withRootStore } from '../lib/with-root-store';

export const SessionStoreModel = types
  .model('SessionStoreModel')
  .props({
    loggedIn: types.optional(types.boolean, false),
    tokenExpired: types.optional(types.boolean, false),
    isValidating: types.optional(types.boolean, true),
    isLoggingOut: types.optional(types.boolean, false),
    afterLoginPath: types.maybeNull(types.string),
    entryPoint: types.maybeNull(types.string),
  })
  .extend(withEnvironment())
  .extend(withRootStore())
  .views((self) => ({}))
  .actions((self) => ({
    resetAuth: flow(function* () {
      self.loggedIn = false;
      self.tokenExpired = false;
      self.rootStore.sandboxStore.clearSandboxId();
      self.rootStore.userStore.unsetCurrentUser();
      self.rootStore.disconnectUserChannel();
    }),
    setAfterLoginPath(path: string | null) {
      self.afterLoginPath = path;
    },
  }))
  .actions((self) => ({
    async handleLogin(response, opts = { redirectToRoot: false }) {
      // console.log('Login response', response);
      if (response.ok && response.data?.data) {
        const user = response.data.data;
        const meta = response.data.meta;

        self.entryPoint = meta?.entryPoint;
        self.loggedIn = true;
        self.rootStore.userStore.setCurrentUser(user);
        // activate persisted data
        self.rootStore.loadLocalPersistedData();
        // connect websocket
        await self.rootStore.subscribeToUserChannel();

        if (opts.redirectToRoot) window.location.replace('/');

        return true;
      }
      // if the response is not OK, reset the auth as if we logged out
      // The sandbox ID should be cleared even if the user did not log
      // out explicitly (ie their token expired)
      self.resetAuth();
      return false;
    },
  }))
  .actions((self) => ({
    validateToken: flow(function* () {
      self.isValidating = true;
      const response: any = yield self.environment.api.validateToken(); // now try to validate this with the server
      yield self.handleLogin(response);
      self.isValidating = false;
    }),
    logout: flow(function* () {
      self.isLoggingOut = true;
      const isAdmin = Boolean(self.entryPoint);

      try {
        const response: any = yield self.environment.api.logout();
        if (response.ok) self.resetAuth();
      } finally {
        const origin = window.location.origin;
        const finalRedirect = `${origin}${isAdmin ? '/admin' : '/'}`;

        const kcLogoutUrl = (import.meta as any)?.env?.VITE_KEYCLOAK_LOGOUT_URL || process.env.VITE_KEYCLOAK_LOGOUT_URL;

        const smLogoutUrl =
          (import.meta as any)?.env?.VITE_SITEMINDER_LOGOUT_URL || process.env.VITE_SITEMINDER_LOGOUT_URL;

        const kc = new URL(kcLogoutUrl);
        kc.searchParams.set('redirect_uri', finalRedirect);

        const sm = new URL(smLogoutUrl);
        sm.searchParams.set('retnow', '1');
        sm.searchParams.set('returl', kc.toString());

        window.location.href = sm.toString();
      }
    }),
    setTokenExpired(isExpired: boolean) {
      self.tokenExpired = isExpired;
    },
    setEntryPoint(entryPoint: string) {
      self.entryPoint = entryPoint;
    },
  }));

export interface ISessionStore extends Instance<typeof SessionStoreModel> {}
