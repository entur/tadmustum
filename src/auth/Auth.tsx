import { AuthProvider as OidcAuthProvider } from 'react-oidc-context';
import { useConfig } from '../config/ConfigContext';
import { Auth, useAuth } from './authUtils';

/**
 * Wraps AuthProvider from react-oidc-context to add the signing callback
 * and redirect uri props.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { oidcConfig } = useConfig();

  return (
    <OidcAuthProvider
      {...oidcConfig!}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
      redirect_uri={oidcConfig?.redirect_uri || window.location.origin + import.meta.env.BASE_URL}
    >
      {children}
    </OidcAuthProvider>
  );
};

// Re-export the Auth interface and useAuth hook
export type { Auth };
export { useAuth };
