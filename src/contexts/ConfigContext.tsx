import type { OidcClientSettings } from 'oidc-client-ts';
import React, { useContext } from 'react';

export interface Config {
  'deviation-messages-api'?: string;
  applicationEnv?: string;
  preferredNameNamespace?: string;
  claimsNamespace?: string;
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
