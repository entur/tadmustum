import type { OidcClientSettings } from "oidc-client-ts";
import React, { useContext } from "react";

export interface Config {
  applicationBaseUrl?: string;
  applicationEnv?: string;
  preferredNameNamespace?: string;
  claimsNamespace?: string;
  oidcConfig?: OidcClientSettings;
  "deviation-messages-api"?: string;
  "journey-planner-api"?: string;
}

export const ConfigContext = React.createContext<Config>({});

export const useConfig = () => {
  return useContext(ConfigContext);
};
