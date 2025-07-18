import type { Config } from "./ConfigContext.tsx";

let fetchedConfig: Config | undefined = undefined;

export const fetchConfig = async (): Promise<Config> => {
  const overrides: Config = { showErrorDetails: false };

  if (import.meta.env.VITE_REACT_APP_APPLICATION_BASE_URL) {
    overrides["deviation-messages-api"] =
      import.meta.env.VITE_REACT_APP_APPLICATION_BASE_URL;
  }

  if (fetchedConfig) {
    return Object.assign({}, fetchedConfig, overrides);
  }

  const response = await fetch(`${import.meta.env.BASE_URL}config.json`);
  fetchedConfig = await response.json();

  return Object.assign({}, fetchedConfig, overrides);
};

export const getFetchedConfig = () => {
  return fetchedConfig;
};
