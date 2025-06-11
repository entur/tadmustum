import type { OidcClientSettings } from "oidc-client-ts";
import React, { useContext } from "react";

export interface Config {
  applicationEnv?: string;
  preferredNameNamespace?: string;
  claimsNamespace?: string;
  oidcConfig?: OidcClientSettings;
  "deviation-messages-api"?: string;
  "journey-planner-api"?: string;
  showErrorDetails: boolean;
}

export const ConfigContext = React.createContext<Config>({
  showErrorDetails: false,
});

export const useConfig = () => {
  return useContext(ConfigContext);
};
