import type { OidcClientSettings } from 'oidc-client-ts';
import React, { useContext } from 'react';

export interface Config {
  'carpool-messages-api'?: string;
  applicationEnv?: string;
  preferredNameNamespace?: string;
  // OidcClientSettings.authority is the OIDC issuer URL — oidc-client-ts's
  // standard setting name, unrelated to transit authorities or codespaces.
  oidcConfig?: OidcClientSettings;
  'journey-planner-api'?: string;
  showErrorDetails: boolean;
  themeFilePath?: string;
}

export const ConfigContext = React.createContext<Config>({
  showErrorDetails: false,
});

export const useConfig = () => {
  return useContext(ConfigContext);
};
