import * as R from 'ramda';
import { ISessionStore } from '../../stores/session-store';
import { IUIStore } from '../../stores/ui-store';
import { isNilOrEmpty } from '../../utils';
import { API_ERROR_TYPES } from '../../utils/api-errors';
import { Api } from '.';

/**
  Watches for "flash" messages from the server and reports them.
 */
export const addFlashMessageMonitor = (api: Api, uiStore: IUIStore) => {
  api.addMonitor((response) => {
    // assuming these are just CLIENT_ERROR - other types handled below in addApiErrorMonitor
    const messageConfig: { [key: string]: any } = R.path(['data', 'meta', 'message'], response);
    if (isNilOrEmpty(messageConfig)) return;

    const { title, message, type } = messageConfig;
    uiStore.flashMessage.show(type, title, message);
  });
};

export const addApiErrorMonitor = (api: Api, uiStore: IUIStore) => {
  api.addMonitor((response) => {
    if (response.problem) {
      const err = API_ERROR_TYPES[response.problem];
      if (err) {
        uiStore.flashMessage.show(err.type, err.message, null);
      }
    }
  });
};

export const addApiUnauthorizedError = (api: Api, sessionStore: ISessionStore) => {
  api.addMonitor((response) => {
    if (response.status === 401) {
      const requestUrl = response.originalError?.request?.responseURL || response.config?.url || '';
      let requestPathname = '';

      try {
        requestPathname = requestUrl ? new URL(requestUrl, window.location.origin).pathname : '';
      } catch {
        requestPathname = '';
      }

      const validateTokenPath = '/api/validate_token';
      const loginPath = '/api/login';
      const isValidateTokenRequest = requestPathname === validateTokenPath;
      const isLoginRequest = requestPathname === loginPath;

      // Ignore login 401s and initial unauthenticated validate_token checks.
      // If validate_token starts returning 401 after being logged in, treat it as session expiry.
      if (isLoginRequest) return;
      if (isValidateTokenRequest && !sessionStore.loggedIn) return;

      sessionStore.setTokenExpired(true);
      // redirect logic handled in navigation/index.tsx based on above flag

      const currentUser = sessionStore.rootStore?.userStore?.currentUser;
      const isContractorFlow =
        sessionStore.entryPoint === 'isContractor' ||
        currentUser?.isContractor ||
        sessionStorage.getItem('isContractorFlow') === 'true' ||
        window.location.pathname.startsWith('/contractor');
      const isAdminFlow =
        sessionStore.entryPoint === 'isAdmin' ||
        sessionStore.entryPoint === 'isAdminMgr' ||
        sessionStore.entryPoint === 'isSysAdmin' ||
        currentUser?.isAdmin ||
        currentUser?.isAdminManager ||
        currentUser?.isSystemAdmin;

      const targetPath = isContractorFlow ? '/contractor' : isAdminFlow ? '/admin' : '/login';

      if (window.location.pathname !== targetPath) {
        window.location.replace(targetPath);
      }
    }
  });
};
