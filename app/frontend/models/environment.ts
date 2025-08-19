import { Api } from '../services/api';

export class Environment {
  api: Api;

  config: {
    KEYCLOAK_LOGOUT_URL: string;
    SITEMINDER_LOGOUT_URL: string;
    POST_LOGOUT_REDIRECT_URL: string;
  };

  constructor() {
    this.api = new Api();

    // read from Vite only once, here
    this.config = {
      KEYCLOAK_LOGOUT_URL: import.meta.env.VITE_KEYCLOAK_LOGOUT_URL as string,
      SITEMINDER_LOGOUT_URL: import.meta.env.VITE_SITEMINDER_LOGOUT_URL as string,
      POST_LOGOUT_REDIRECT_URL: import.meta.env.VITE_POST_LOGOUT_REDIRECT_URL as string,
    };
  }
}
